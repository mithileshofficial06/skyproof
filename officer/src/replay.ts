// Rebuild a flight from 0G alone and check it: anchors from 0G Chain, encrypted segments from
// 0G Storage, decrypted with the flight key the operator released.
//   pnpm replay <local-flight-id>            (uses .tmp/keys/<id>.key and the manifest for the chain id)
//   pnpm replay <local-flight-id> --tamper   (edits one record after download to show detection)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contracts, provider, storageDownload, airframeKey } from "./chain.js";
import { decryptSegment, segmentAad } from "./crypto.js";
import type { FlightRecord } from "./record.js";
import { verifyFlight, type AnchorView } from "./verify.js";

const TMP = fileURLToPath(new URL("../.tmp/", import.meta.url));
const id = process.argv[2];
const tamper = process.argv.includes("--tamper");
const deleteOne = process.argv.includes("--delete");
if (!id) {
  console.log("usage: pnpm replay <local-flight-id> [--tamper|--delete]");
  process.exit(1);
}
const manifestFile = `${TMP}flights/${id}.manifest.json`;
if (!existsSync(manifestFile)) throw new Error(`no manifest for ${id}`);
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const key = Buffer.from(readFileSync(`${TMP}keys/${id}.key`, "utf8").trim(), "hex");

const { log, registry } = contracts(provider);
const chainId: string = manifest.chainFlightId;
const f = await log.flights(chainId);
const raw = await log.getAnchors(chainId);
const anchors: AnchorView[] = raw.map((a: any) => ({ seq: Number(a.seq), head: a.head, storageRoot: a.storageRoot, time: Number(a.time) }));
const reg = await registry.airframes(airframeKey(manifest.airframeId));

console.log(`flight ${id}`);
console.log(`  0G Chain FlightLog ${log.target}  flight ${chainId}`);
console.log(`  operator ${f.operator}  open=${f.open}  anchors=${anchors.length}  permit on-chain ${reg.permitHash.slice(0, 18)}…`);

// Download each segment named by an anchor, from 0G Storage, by its root hash.
mkdirSync(`${TMP}dl`, { recursive: true });
const records: FlightRecord[] = [];
for (const [i, a] of anchors.entries()) {
  const t0 = Date.now();
  const blob = await storageDownload(a.storageRoot, `${TMP}dl/${id}-${i}.bin`);
  const seg = JSON.parse(decryptSegment(key, segmentAad(chainId, i), blob));
  records.push(...seg.records);
  console.log(`  segment ${i}: records ${seg.fromSeq}-${seg.toSeq} from 0G Storage root ${a.storageRoot.slice(0, 14)}… (${blob.length} B, ${Date.now() - t0} ms)`);
}

if (tamper) {
  // The operator's two most likely lies: "0G said yes" and "we never flew there".
  const d = records.find((r) => r.type === "DECISION" && (r.body as any).verdict === "DENY");
  if (d) {
    (d.body as any).verdict = "ALLOW";
    console.log(`  ** TAMPER: changed DENY in record ${d.seq} to ALLOW **`);
  } else {
    const st = records.find((r) => r.type === "STATE");
    if (st) {
      for (const s of (st.body as any).samples) s.pos = [s.pos[0] * 0.2, s.pos[1] * 0.2];
      console.log(`  ** TAMPER: rewrote the GPS track in record ${st.seq} to hide where the drone flew **`);
    }
  }
}
if (deleteOne) {
  const idx = records.findIndex((r) => r.type === "ACTION");
  if (idx >= 0) {
    console.log(`  ** TAMPER: deleted record ${records[idx].seq} (${records[idx].type}) **`);
    records.splice(idx, 1);
  }
}

const report = verifyFlight(records, anchors, f.operator, reg.permitHash);
console.log(`\nrecord: ${report.records} records, ${report.decisions.length} decisions, ${report.actions} actions, ${report.safeStops} safe-stop steps`);
console.log(report.ok ? "integrity: ✅ intact, every 0G Chain anchor matches" : "integrity: ❌ BROKEN");
for (const i of report.issues) console.log(`  ❌ ${i}`);
console.log("\ndecisions:");
for (const d of report.decisions) console.log(`  #${String(d.seq).padStart(3)} ${d.kind.padEnd(17)} -> ${String(d.result).padEnd(16)} [${d.source}] ${d.zgRequestId ?? ""}`);
console.log(`\nverdict: ${report.verdict}`);
for (const b of report.breaches) console.log(`  ${b.code}${b.seq !== null ? ` (record ${b.seq})` : ""}: ${b.detail}`);

mkdirSync(`${TMP}replay`, { recursive: true });
const out = `${TMP}replay/${id}${tamper || deleteOne ? "-tampered" : ""}.json`;
writeFileSync(out, JSON.stringify({ manifest, anchors, report, records }, null, 1));
console.log(`\nfull replay saved to ${out}`);
const tip = await provider.getBlockNumber();
console.log(`(0G Galileo block ${tip})`);
