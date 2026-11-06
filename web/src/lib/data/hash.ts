// The black box's hash chain, exactly as the officer seals it (specs/05a D1):
//   hash_i = keccak256(canonicalJSON(record_i without hash, sig)),  record_i.prev = hash_{i-1},  prev_0 = 0x00..00
// Segment heads are anchored on FlightLog (0G Chain). Rebuilding a genuine flight reproduces the sealed hashes
// exactly, so this page can truthfully say "matches the 0G record". Pure functions, no React.
import { keccak256, stringToBytes } from "viem";
import type { Anchor, Hex, SealedRecord } from "./types";

export const ZERO = `0x${"00".repeat(32)}` as Hex;

/** keys sorted, no whitespace, undefined dropped: the officer's canonical JSON */
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

export function recordHash(r: SealedRecord): Hex {
  const unsigned: Record<string, unknown> = { ...r };
  delete unsigned.hash; // the fingerprint and signature are not part of what is fingerprinted
  delete unsigned.sig;
  return keccak256(stringToBytes(canonical(unsigned)));
}

/** Re-link and re-fingerprint records in order: what a forger would have to do after an edit. */
export function buildChain(records: SealedRecord[]): Hex[] {
  const out: Hex[] = [];
  let prev = ZERO;
  for (const r of records) {
    prev = recordHash({ ...r, prev });
    out.push(prev);
  }
  return out;
}

export function firstMismatch(a: readonly string[], b: readonly string[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i]?.toLowerCase() !== b[i]?.toLowerCase()) return i;
  return -1;
}

/**
 * Check a copy of a flight against what was sealed: every fingerprint, the sequence (a deleted record shows
 * as a gap) and the segment heads anchored on 0G Chain.
 */
export function verify(records: SealedRecord[], sealed: readonly Hex[], anchors: readonly Anchor[] = []) {
  const chain = buildChain(records);
  let firstBad = records.findIndex((r, i) => r.seq !== i);
  const m = firstMismatch(chain, sealed);
  if (m >= 0 && (firstBad < 0 || m < firstBad)) firstBad = m;
  const badAnchor = anchors.find((a) => chain[a.seq] === undefined || chain[a.seq].toLowerCase() !== a.head.toLowerCase());
  return { ok: firstBad < 0 && !badAnchor, firstBad, chain, badAnchorSeq: badAnchor?.seq ?? null };
}

/** Edit a deep copy of record `ri`; the original is untouched. */
export function tamper(records: SealedRecord[], ri: number, edit: (r: SealedRecord) => void): SealedRecord[] {
  const copy: SealedRecord[] = JSON.parse(JSON.stringify(records));
  edit(copy[ri]);
  return copy;
}

/** Edit one telemetry sample of a STATE record (the spec's per-sample tamper). */
export function tamperSample(records: SealedRecord[], ri: number, si: number, patch: Record<string, unknown>): SealedRecord[] {
  return tamper(records, ri, (r) => {
    const s = r.body?.samples?.[si];
    if (!s) throw new Error(`record #${ri} has no sample ${si}`);
    Object.assign(s, patch);
  });
}
