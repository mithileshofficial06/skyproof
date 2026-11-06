// Published flight file -> FlightRecord (pure, so it is unit-tested against real flights).
import { ARC_EXPLORER, type FlightFile, ZG_EXPLORER } from "../flight";
import type { Anchor, FlightRecord, Hex, PathPoint } from "./types";

export function toFlightRecord(f: FlightFile, source: FlightRecord["source"], anchors?: Anchor[]): FlightRecord {
  const seen = new Set<number>();
  const path: PathPoint[] = [];
  for (const r of f.records) {
    if (r.type !== "STATE") continue;
    for (const s of r.body?.samples ?? []) {
      if (seen.has(s.t)) continue;
      seen.add(s.t);
      path.push({ t: s.t, x: s.pos[0], y: s.pos[1], alt: s.alt, vx: s.vel?.[0] ?? 0, vy: s.vel?.[1] ?? 0, vz: s.vel?.[2] ?? 0 });
    }
  }
  path.sort((a, b) => a.t - b.t);
  const paid = f.claims.find((c) => c.state === "Paid");
  const held = f.claims.find((c) => c.state === "Held");
  const claim = paid ?? held ?? f.claims[0];
  return {
    id: f.flightId,
    scenario: f.scenario,
    source,
    blocks: f.records,
    anchoredHashes: f.records.map((r) => r.hash as Hex),
    anchors: anchors ?? f.anchors.map((a) => ({ seq: a.seq, head: a.head as Hex })),
    anchorsFrom: anchors ? "0g-chain" : "export",
    operator: f.chain.operator as Hex,
    path,
    zeroG: { recordId: f.chain.chainFlightId as Hex, flightLog: f.chain.flightLog as Hex, url: f.chain.openTx ? `${ZG_EXPLORER}/tx/${f.chain.openTx}` : `${ZG_EXPLORER}/address/${f.chain.flightLog}` },
    chainlink: { verdict: f.report.verdict, breaches: f.report.breaches.map((b) => b.code), url: claim?.closeTx ? `${ARC_EXPLORER}/tx/${claim.closeTx}` : undefined },
    arc: { status: paid ? "paid" : held ? "held" : f.claims.length ? "pending" : "none", claimId: claim?.claimId, url: `${ARC_EXPLORER}/address/${f.arc.escrow}` },
  };
}
