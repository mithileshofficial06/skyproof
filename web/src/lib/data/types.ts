// Data contracts for /experience (specs/05-uiux.md Section 5, adapted per specs/05a D1/D4/D12).
// A "block" is one real signed record of a sealed flight; its fingerprint is the one sealed on 0G.
import type { FlightRecord as SealedRecord } from "../flight";

export type { SealedRecord };
export type Hex = `0x${string}`;
export type Verdict = "idle" | "pending" | "pass" | "fail";

/** a segment head anchored on FlightLog (0G Chain): the fingerprint of record `seq` */
export interface Anchor {
  seq: number;
  head: Hex;
}

/** one telemetry sample, simulator metres (x east, y north, alt up) */
export interface PathPoint {
  t: number;
  x: number;
  y: number;
  alt: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface FlightRecord {
  id: string;
  scenario: string;
  source: "replay" | "live";
  blocks: SealedRecord[];
  /** each block's fingerprint as recorded (record.hash), in order */
  anchoredHashes: Hex[];
  /** segment heads anchored on 0G Chain; `anchorsFrom` says where they were read */
  anchors: Anchor[];
  anchorsFrom: "0g-chain" | "export";
  operator: Hex;
  path: PathPoint[];
  zeroG: { recordId: Hex; flightLog: Hex; url: string };
  chainlink: { verdict: "BREACH" | "REVIEW"; breaches: string[]; url?: string };
  arc: { status: "none" | "pending" | "paid" | "held" | "blocked"; claimId?: number; url?: string };
}

export interface FlightSource {
  /** no id: the pinned sample flight */
  load(id?: string): Promise<FlightRecord>;
}
