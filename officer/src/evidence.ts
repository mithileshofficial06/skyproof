// Evidence endpoint run by the operator. Once a claim exists on Arc for the airframe, it releases the
// flight record: it downloads the encrypted segments from 0G Storage and decrypts them with the flight key.
// The judge (Chainlink CRE) does NOT trust this server: it checks every record against the anchors on 0G Chain.
// It also hosts the claims desk: the victim's evidence bundle and the insurer's written reasons are
// stored on 0G Storage. Both are bound to Arc (evidence hash in the claim, decision tx in the note),
// so this server can withhold them but never alter them unnoticed.
//   pnpm evidence            -> http://localhost:8788/evidence/<chainFlightId>
import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { contracts, operatorWallet, provider, storageDownload, storageUpload } from "./chain.js";
import { decryptSegment, segmentAad } from "./crypto.js";
import { arcProvider, escrow } from "./arc.js";
import { airframeKey } from "./chain.js";

const PORT = Number(process.env.EVIDENCE_PORT || 8788);
const TMP = fileURLToPath(new URL("../.tmp/", import.meta.url));
const cache = new Map<string, unknown>();

function manifestFor(chainFlightId: string) {
  for (const f of readdirSync(`${TMP}flights`).filter((f) => f.endsWith(".manifest.json"))) {
    const m = JSON.parse(readFileSync(`${TMP}flights/${f}`, "utf8"));
    if (m.chainFlightId.toLowerCase() === chainFlightId.toLowerCase()) return m;
  }
  return null;
}

async function hasClaim(airframeId: string): Promise<boolean> {
  const e = escrow();
  const n = Number(await e.nextClaimId());
  const af = airframeKey(airframeId);
  for (let id = n - 1; id >= 1 && id >= n - 50; id--) {
    const c = await e.claims(id);
    if (c.airframeId === af && Number(c.state) >= 1) return true;
  }
  return false;
}

async function release(chainFlightId: string) {
  if (cache.has(chainFlightId)) return cache.get(chainFlightId);
  const m = manifestFor(chainFlightId);
  if (!m) return { status: 404, body: { error: "unknown flight" } };
  if (!(await hasClaim(m.airframeId))) return { status: 403, body: { error: "no claim on Arc for this airframe: key not released" } };
  const key = Buffer.from(readFileSync(`${TMP}keys/${m.flightId}.key`, "utf8").trim(), "hex");
  const records: unknown[] = [];
  for (const s of m.segments) {
    const blob = await storageDownload(s.rootHash, `${TMP}dl/ev-${m.flightId}-${s.index}.bin`);
    records.push(...JSON.parse(decryptSegment(key, segmentAad(chainFlightId, s.index), blob)).records);
  }
  const out = { status: 200, body: { chainFlightId, flightId: m.flightId, source: "0G Storage", roots: m.segments.map((s: any) => s.rootHash), records } };
  cache.set(chainFlightId, out);
  return out;
}

/** Which flight was airframe `af` flying at unix time `t`? (The judge re-checks this on 0G Chain.) */
async function lookup(af: string, t: number) {
  const { log } = contracts(provider);
  for (const f of readdirSync(`${TMP}flights`).filter((f) => f.endsWith(".manifest.json"))) {
    const m = JSON.parse(readFileSync(`${TMP}flights/${f}`, "utf8"));
    if (airframeKey(m.airframeId).toLowerCase() !== af.toLowerCase() || !m.closed) continue;
    const fl = await log.flights(m.chainFlightId);
    if (Number(fl.openedAt) <= t && t <= Number(fl.closedAt)) return { status: 200, body: { chainFlightId: m.chainFlightId } };
  }
  return { status: 404, body: { error: "no sealed flight for that airframe at that time" } };
}

// ---- claims desk ------------------------------------------------------------------------------
const DESK = `${TMP}claims/`;
mkdirSync(DESK, { recursive: true });
const MAX_BODY = 6 * 1024 * 1024;

function body(req: import("node:http").IncomingMessage): Promise<any> {
  return new Promise((ok, fail) => {
    let n = 0;
    const parts: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      n += c.length;
      if (n > MAX_BODY) return fail(new Error("evidence too large (max 6 MB)"));
      parts.push(c);
    });
    req.on("end", () => {
      try {
        ok(JSON.parse(Buffer.concat(parts).toString("utf8")));
      } catch (e) {
        fail(e);
      }
    });
  });
}

/** Victim evidence: the exact bytes are sealed on 0G Storage; keccak256(bytes) goes into the Arc claim. */
async function sealEvidence(b: any) {
  if (typeof b?.statement !== "string" || !b.statement.trim()) return { status: 400, body: { error: "a written statement is required" } };
  const files = (Array.isArray(b.files) ? b.files : []).slice(0, 4).map((f: any) => ({ name: String(f.name).slice(0, 80), type: String(f.type).slice(0, 40), dataB64: String(f.dataB64) }));
  const bundle = { kind: "skyproof-victim-evidence/v1", flightId: String(b.flightId ?? ""), statement: b.statement.slice(0, 2000), files, createdAt: new Date().toISOString() };
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  const evidenceHash = ethers.keccak256(bytes);
  const up = await storageUpload(bytes, operatorWallet());
  writeFileSync(`${DESK}${evidenceHash}.json`, JSON.stringify({ evidenceHash, rootHash: up.rootHash, storageTx: up.txHash }));
  writeFileSync(`${DESK}${evidenceHash}.bundle`, bytes);
  return { status: 200, body: { evidenceHash, rootHash: up.rootHash, storageTx: up.txHash } };
}

async function getEvidence(hash: string) {
  const metaFile = `${DESK}${hash.toLowerCase()}.json`;
  if (!existsSync(metaFile)) return { status: 404, body: { error: "no evidence bundle for this hash" } };
  const meta = JSON.parse(readFileSync(metaFile, "utf8"));
  const cached = `${DESK}${hash.toLowerCase()}.bundle`;
  const bytes = existsSync(cached) ? readFileSync(cached) : await storageDownload(meta.rootHash, `${TMP}dl/claim-${hash}.bin`);
  return { status: 200, body: { ...meta, bundleB64: Buffer.from(bytes).toString("base64") } };
}

const decisionText = (claimId: number, approve: boolean, reason: string, tx: string) => `SkyProof insurer decision
claim #${claimId}: ${approve ? "APPROVE" : "REJECT"}
Arc tx: ${tx}
reason: ${reason}`;

/** Insurer's written reason: signed by the insurer wallet, checked against the decision on Arc, sealed on 0G. */
async function sealDecision(b: any) {
  const claimId = Number(b?.claimId);
  const reason = String(b?.reason ?? "").trim().slice(0, 2000);
  if (!claimId || !reason || !/^0x[0-9a-fA-F]{64}$/.test(b?.tx ?? "")) return { status: 400, body: { error: "claimId, reason and tx are required" } };
  const e = escrow();
  const insurer = String(await e.insurer());
  let signer = "";
  try {
    signer = ethers.verifyMessage(decisionText(claimId, !!b.approve, reason, b.tx), String(b.signature));
  } catch {}
  if (signer.toLowerCase() !== insurer.toLowerCase()) return { status: 403, body: { error: "not signed by the insurer" } };
  const rc = await arcProvider.getTransactionReceipt(b.tx);
  const ev = rc?.logs.map((l) => { try { return e.interface.parseLog(l); } catch { return null; } }).find((x) => x?.name === "HeldResolved");
  if (!ev || Number(ev.args.claimId) !== claimId || ev.args.approved !== !!b.approve) return { status: 400, body: { error: "that tx is not this decision on Arc" } };
  const note = { kind: "skyproof-insurer-decision/v1", claimId, approve: !!b.approve, reason, decisionTx: b.tx, insurer, signature: b.signature };
  const up = await storageUpload(new TextEncoder().encode(JSON.stringify(note)), operatorWallet());
  const out = { ...note, rootHash: up.rootHash, storageTx: up.txHash };
  writeFileSync(`${DESK}decision-${claimId}.json`, JSON.stringify(out));
  return { status: 200, body: out };
}

function getDecision(claimId: number) {
  const f = `${DESK}decision-${claimId}.json`;
  return existsSync(f) ? { status: 200, body: JSON.parse(readFileSync(f, "utf8")) } : { status: 404, body: { error: "no written reason for this claim" } };
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }
  const ce = req.url?.match(/^\/claim-evidence\/(0x[0-9a-fA-F]{64})$/);
  const dc = req.url?.match(/^\/decision\/(\d+)$/);
  if (req.method === "POST" || ce || dc) {
    try {
      const r: any =
        req.method === "POST" && req.url === "/claim-evidence" ? await sealEvidence(await body(req))
        : req.method === "POST" && req.url === "/decision" ? await sealDecision(await body(req))
        : ce ? await getEvidence(ce[1])
        : dc ? getDecision(Number(dc[1]))
        : { status: 404, body: { error: "not found" } };
      res.writeHead(r.status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(r.body));
      console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.url} -> ${r.status}`);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
    return;
  }
  const mt = req.url?.match(/^\/evidence\/(0x[0-9a-fA-F]{64})$/);
  const lk = req.url?.match(/^\/lookup\?airframe=(0x[0-9a-fA-F]{64})&t=(\d+)$/);
  try {
    const r: any = mt ? await release(mt[1]) : lk ? await lookup(lk[1], Number(lk[2])) : { status: 404, body: { error: "GET /evidence/<chainFlightId> or /lookup?airframe=&t=" } };
    res.writeHead(r.status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(r.body));
    console.log(`${new Date().toISOString().slice(11, 19)} ${req.url} -> ${r.status}${r.body.records ? ` (${r.body.records.length} records)` : ""}`);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}).listen(PORT, () => console.log(`evidence server on http://localhost:${PORT}/evidence/<chainFlightId>  (ethers ${ethers.version})`));
