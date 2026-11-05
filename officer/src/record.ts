// The flight record: an append-only, hash-chained, signed list of everything that happened.
// Phase 2 adds encryption, 0G Storage upload and 0G Chain anchors on top of this.
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

export type RecordType = "PERMIT" | "STATE" | "DECISION" | "ACTION" | "SAFE_STOP_LOCAL" | "OVERRIDE" | "CLOSE";

export interface FlightRecord {
  flightId: string;
  seq: number;
  prev: string;
  type: RecordType;
  body: unknown;
  localTime: number;
  hash: string;
  sig: string;
}

/** Deterministic JSON: object keys sorted, no whitespace. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

export const ZERO = "0x" + "00".repeat(32);
const DIR = fileURLToPath(new URL("../.tmp/flights/", import.meta.url));

export class FlightRecorder {
  seq = 0;
  head = ZERO;
  readonly file: string;
  readonly records: FlightRecord[] = [];

  constructor(readonly flightId: string, private signer: ethers.Wallet) {
    mkdirSync(DIR, { recursive: true });
    this.file = `${DIR}${flightId}.jsonl`;
  }

  append(type: RecordType, body: unknown): FlightRecord {
    const unsigned = { flightId: this.flightId, seq: this.seq, prev: this.head, type, body, localTime: Date.now() };
    const hash = ethers.keccak256(ethers.toUtf8Bytes(canonical(unsigned)));
    const sig = this.signer.signingKey.sign(hash).serialized;
    const rec: FlightRecord = { ...unsigned, hash, sig };
    appendFileSync(this.file, JSON.stringify(rec) + "\n");
    this.records.push(rec);
    this.head = hash;
    this.seq += 1;
    return rec;
  }
}

/** Re-check a list of records: chain links, hashes and signer. Returns the first problem, or null. */
export function verifyChain(records: FlightRecord[], expectedSigner: string): string | null {
  let prev = ZERO;
  for (const [i, r] of records.entries()) {
    if (r.seq !== i) return `seq gap at ${i} (found ${r.seq})`;
    if (r.prev !== prev) return `broken link at seq ${r.seq}`;
    const { hash, sig, ...unsigned } = r;
    const h = ethers.keccak256(ethers.toUtf8Bytes(canonical(unsigned)));
    if (h !== hash) return `edited record at seq ${r.seq}`;
    if (ethers.recoverAddress(hash, sig).toLowerCase() !== expectedSigner.toLowerCase()) return `bad signature at seq ${r.seq}`;
    prev = hash;
  }
  return null;
}
