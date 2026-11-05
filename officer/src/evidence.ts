// Evidence endpoint run by the operator. Once a claim exists on Arc for the airframe, it releases the
// flight record: it downloads the encrypted segments from 0G Storage and decrypts them with the flight key.
// The judge (Chainlink CRE) does NOT trust this server: it checks every record against the anchors on 0G Chain.
//   pnpm evidence            -> http://localhost:8788/evidence/<chainFlightId>
import { createServer } from "node:http";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { contracts, provider, storageDownload } from "./chain.js";
import { decryptSegment, segmentAad } from "./crypto.js";
import { escrow } from "./arc.js";
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

createServer(async (req, res) => {
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
