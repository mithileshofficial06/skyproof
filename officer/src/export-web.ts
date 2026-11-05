// Export sealed flights for the website: each flight is rebuilt from 0G (anchors from 0G Chain,
// segments from 0G Storage), verified, and written with its Arc claim status to web/public/data/flights/.
//   pnpm export-web            (all sealed flights not yet exported)
//   pnpm export-web --all      (re-export everything)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { airframeKey, contracts, provider, storageDownload } from "./chain.js";
import { decryptSegment, segmentAad } from "./crypto.js";
import { verifyFlight, type AnchorView } from "./verify.js";
import { CLAIM_STATES, escrow, escrowAddress, usd } from "./arc.js";
import type { FlightRecord } from "./record.js";

const TMP = fileURLToPath(new URL("../.tmp/", import.meta.url));
const OUT = fileURLToPath(new URL("../../web/public/data/flights/", import.meta.url));
const all = process.argv.includes("--all");
mkdirSync(OUT, { recursive: true });
mkdirSync(`${TMP}dl`, { recursive: true });

const { log, registry, deployment } = contracts(provider);
const claimsByFlight = new Map<string, any[]>();
for (const f of existsSync(`${TMP}claims`) ? readdirSync(`${TMP}claims`) : []) {
  const c = JSON.parse(readFileSync(`${TMP}claims/${f}`, "utf8"));
  const onchain = await escrow().claims(c.claimId);
  const entry = {
    claimId: c.claimId,
    state: CLAIM_STATES[Number(onchain.state)],
    verdict: ["NONE", "BREACH", "REVIEW"][Number(onchain.verdict)] ?? "NONE",
    breachCode: Number(onchain.verdict) ? ethers.decodeBytes32String(onchain.breachCode) : null,
    reportHash: onchain.reportHash,
    cap: usd(onchain.cap),
    victim: onchain.victim,
    openTx: null,
    closeTx: c.closeTx,
  };
  claimsByFlight.set(c.flightId, [...(claimsByFlight.get(c.flightId) ?? []), entry]);
}

const index: any[] = existsSync(`${OUT}index.json`) && !all ? JSON.parse(readFileSync(`${OUT}index.json`, "utf8")) : [];
const done = new Set(index.map((x) => x.flightId));
for (const f of readdirSync(`${TMP}flights`).filter((f) => f.endsWith(".manifest.json")).sort()) {
  const m = JSON.parse(readFileSync(`${TMP}flights/${f}`, "utf8"));
  if (!m.closed || (done.has(m.flightId) && !claimsByFlight.has(m.flightId))) continue;
  try {
    const fl = await log.flights(m.chainFlightId);
    const anchors: AnchorView[] = (await log.getAnchors(m.chainFlightId)).map((a: any) => ({ seq: Number(a.seq), head: a.head, storageRoot: a.storageRoot, time: Number(a.time) }));
    const key = Buffer.from(readFileSync(`${TMP}keys/${m.flightId}.key`, "utf8").trim(), "hex");
    const records: FlightRecord[] = [];
    for (const [i, a] of anchors.entries()) {
      const blob = await storageDownload(a.storageRoot, `${TMP}dl/web-${m.flightId}-${i}.bin`);
      records.push(...JSON.parse(decryptSegment(key, segmentAad(m.chainFlightId, i), blob)).records);
    }
    const reg = await registry.airframes(airframeKey(m.airframeId));
    const report = verifyFlight(records, anchors, fl.operator, reg.permitHash);
    const scenario = (records[0]?.body as any)?.scenario ?? "unknown";
    const out = {
      flightId: m.flightId,
      scenario,
      chain: { network: "0G Galileo", chainId: 16602, flightLog: deployment.FlightLog, registry: deployment.DroneRegistry, chainFlightId: m.chainFlightId, operator: fl.operator, openedAt: Number(fl.openedAt), closedAt: Number(fl.closedAt), openTx: m.openTx, closeTx: m.closeTx },
      segments: m.segments.map((s: any) => ({ index: s.index, fromSeq: s.fromSeq, toSeq: s.toSeq, rootHash: s.rootHash, storageTx: s.storageTx, anchorTx: s.anchorTx, bytes: s.bytes })),
      anchors,
      report,
      claims: claimsByFlight.get(m.flightId) ?? [],
      arc: { escrow: escrowAddress },
      records,
    };
    writeFileSync(`${OUT}${m.flightId}.json`, JSON.stringify(out));
    const summary = {
      flightId: m.flightId, scenario, startedAt: records[0]?.localTime, records: records.length,
      decisions: report.decisions.length, zgDecisions: report.decisions.filter((d) => d.source.startsWith("0G")).length,
      intact: report.ok, verdict: report.verdict, breaches: [...new Set(report.breaches.map((b) => b.code))],
      chainFlightId: m.chainFlightId, claims: out.claims.map((c) => ({ claimId: c.claimId, state: c.state, verdict: c.verdict })),
    };
    const i = index.findIndex((x) => x.flightId === m.flightId);
    if (i >= 0) index[i] = summary;
    else index.push(summary);
    console.log(`exported ${m.flightId}: ${records.length} records, ${report.verdict}, intact ${report.ok}`);
  } catch (e) {
    console.log(`skipped ${m.flightId}: ${(e as Error).message.slice(0, 120)}`);
  }
}
index.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
writeFileSync(`${OUT}index.json`, JSON.stringify(index, null, 1));
console.log(`${index.length} flights in web/public/data/flights/index.json`);
