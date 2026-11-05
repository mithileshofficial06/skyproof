// Independent check of a flight rebuilt from 0G: chain integrity, anchors, signer, permit,
// and the objective breach rules (B1-B6). The Chainlink CRE judge applies the same rules.
import { ethers } from "ethers";
import { canonical, ZERO, type FlightRecord } from "./record.js";
import { noFlyHit, outsideGeofence, type Permit, type XY } from "./permit.js";

export interface AnchorView {
  seq: number;
  head: string;
  storageRoot: string;
  time: number;
}

export interface Breach {
  code: "B1_GEOFENCE" | "B2_ALTITUDE" | "B3_UNAPPROVED_ACTION" | "B4_OVERRIDE_ON_DENY" | "B5_RECORD_BROKEN" | "B6_UNSAFE_WIND_LAUNCH";
  seq: number | null;
  detail: string;
}

export interface FlightReport {
  ok: boolean;               // record intact and matches the chain
  records: number;
  issues: string[];          // integrity problems (each is also a B5 breach)
  breaches: Breach[];
  verdict: "BREACH" | "REVIEW";
  decisions: { seq: number; kind: string; what: string; result: string; source: string; zgRequestId: string | null }[];
  safeStops: number;
  actions: number;
}

export function verifyFlight(records: FlightRecord[], anchors: AnchorView[], expectedSigner: string, expectedPermitHash?: string): FlightReport {
  const issues: string[] = [];
  const breaches: Breach[] = [];

  // ---- integrity: seq, links, hashes, signatures ---------------------------------
  let prev = ZERO;
  const bySeq = new Map<number, FlightRecord>();
  for (const [i, r] of records.entries()) {
    if (r.seq !== i) { issues.push(`missing or reordered record at position ${i} (found seq ${r.seq})`); break; }
    if (r.prev !== prev) issues.push(`broken link at seq ${r.seq}`);
    const { hash, sig, ...unsigned } = r;
    const h = ethers.keccak256(ethers.toUtf8Bytes(canonical(unsigned)));
    if (h !== hash) issues.push(`record ${r.seq} was edited (hash mismatch)`);
    else if (ethers.recoverAddress(hash, sig).toLowerCase() !== expectedSigner.toLowerCase()) issues.push(`record ${r.seq} not signed by the operator`);
    prev = hash;
    bySeq.set(r.seq, r);
  }
  // ---- anchors: each on-chain fingerprint must match the record at that seq --------
  if (anchors.length === 0) issues.push("no anchors on 0G Chain");
  for (const a of anchors) {
    const r = bySeq.get(a.seq);
    if (!r) issues.push(`anchor at seq ${a.seq} has no matching record (records missing)`);
    else if (r.hash !== a.head) issues.push(`anchor at seq ${a.seq} does not match the record (record replaced)`);
  }
  const last = anchors[anchors.length - 1];
  if (last && records.length - 1 > last.seq) issues.push(`records after the last anchor (seq ${last.seq}) are not fingerprinted`);
  if (records.length && records[records.length - 1].type !== "CLOSE") issues.push("flight record does not end with CLOSE");

  // ---- permit ---------------------------------------------------------------------
  const permitRec = records[0];
  const permitBody = (permitRec?.body ?? {}) as { permit?: Permit; permitHash?: string };
  if (!permitRec || permitRec.type !== "PERMIT" || !permitBody.permit) issues.push("first record is not the PERMIT");
  if (expectedPermitHash && permitBody.permitHash && permitBody.permitHash !== expectedPermitHash) issues.push("permit in the record differs from the registered permit");
  for (const i of issues) breaches.push({ code: "B5_RECORD_BROKEN", seq: null, detail: i });

  // ---- objective breach rules -----------------------------------------------------
  const permit = permitBody.permit;
  const decisions: FlightReport["decisions"] = [];
  const decisionByHash = new Map<string, FlightRecord>();
  let safeStops = 0;
  let actions = 0;
  let lastDenied: string | null = null;
  for (const r of records) {
    const b = r.body as any;
    if (r.type === "DECISION") {
      decisionByHash.set(r.hash, r);
      if (b.kind === "SITUATION") {
        decisions.push({ seq: r.seq, kind: b.request.situation.kind, what: b.request.situation.detail, result: b.choice ?? b.verdict, source: b.source, zgRequestId: b.zg?.requestId ?? null });
      } else {
        decisions.push({ seq: r.seq, kind: b.request.cmd.type, what: `${b.request.cmd.type} to ${JSON.stringify(b.request.cmd.to)}`, result: `${b.verdict} ${b.code}`, source: b.source, zgRequestId: b.zg?.requestId ?? null });
        lastDenied = b.verdict === "ALLOW" ? null : b.request.cmd.type;
      }
    }
    if (r.type === "SAFE_STOP_LOCAL") safeStops++;
    if (r.type === "ACTION") {
      actions++;
      const cmd = b.cmd;
      const d = b.decisionHash ? decisionByHash.get(b.decisionHash) : undefined;
      const approved = d && ((d.body as any).verdict === "ALLOW");
      if (!approved) breaches.push({ code: "B3_UNAPPROVED_ACTION", seq: r.seq, detail: `${cmd.type}${cmd.choice ? " " + cmd.choice : ""} executed without an approved 0G decision` });
      if (cmd.type === "TAKEOFF" && permit && b.state?.windMs > permit.maxWindMs)
        breaches.push({ code: "B6_UNSAFE_WIND_LAUNCH", seq: r.seq, detail: `take-off in ${b.state.windMs} m/s wind (limit ${permit.maxWindMs})` });
    }
    if (r.type === "OVERRIDE" && lastDenied) breaches.push({ code: "B4_OVERRIDE_ON_DENY", seq: r.seq, detail: `manual override after ${lastDenied} was denied` });
    if (r.type === "STATE" && permit) {
      for (const s of (b.samples ?? []) as { pos: XY; alt: number; t: number }[]) {
        if (s.alt < 0.15) continue; // on the ground
        if (outsideGeofence(permit, [s.pos])) { breaches.push({ code: "B1_GEOFENCE", seq: r.seq, detail: `outside the permitted area at t=${s.t}s, pos ${JSON.stringify(s.pos)}` }); break; }
        const nf = noFlyHit(permit, [s.pos]);
        if (nf) { breaches.push({ code: "B1_GEOFENCE", seq: r.seq, detail: `inside no-fly zone ${nf} at t=${s.t}s, pos ${JSON.stringify(s.pos)}` }); break; }
        if (s.alt > permit.altCeilingM) { breaches.push({ code: "B2_ALTITUDE", seq: r.seq, detail: `${s.alt} m above the ${permit.altCeilingM} m ceiling at t=${s.t}s` }); break; }
      }
    }
  }
  return {
    ok: issues.length === 0,
    records: records.length,
    issues,
    breaches,
    verdict: breaches.length ? "BREACH" : "REVIEW",
    decisions,
    safeStops,
    actions,
  };
}
