// specs/05-uiux.md 12.1 (adapted per 05a D1): the chain logic against a REAL sealed flight.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildChain, canonical, firstMismatch, tamper, tamperSample, verify, ZERO } from "@/lib/data/hash";
import { toFlightRecord } from "@/lib/data/map";
import type { FlightFile } from "@/lib/flight";

const flight: FlightFile = JSON.parse(readFileSync(new URL("../public/data/sample-flight.json", import.meta.url), "utf8"));
const f = toFlightRecord(flight, "replay");
const N = f.blocks.length;
const stateIdx = f.blocks.findIndex((r, i) => r.type === "STATE" && i > 5);

describe("hash chain on a real sealed flight", () => {
  it("rebuilding reproduces every fingerprint sealed on 0G", () => {
    expect(firstMismatch(buildChain(f.blocks), f.anchoredHashes)).toBe(-1);
    expect(f.blocks[0].prev).toBe(ZERO);
  });

  it("the genuine record verifies, including the 0G Chain anchors", () => {
    const v = verify(f.blocks, f.anchoredHashes, f.anchors);
    expect(v).toMatchObject({ ok: true, firstBad: -1, badAnchorSeq: null });
    expect(f.anchors.length).toBeGreaterThan(0);
  });

  it("is deterministic: same records, same chain", () => {
    expect(buildChain(f.blocks)).toEqual(buildChain(JSON.parse(JSON.stringify(f.blocks))));
  });

  it("canonical JSON ignores key order and undefined", () => {
    expect(canonical({ b: 1, a: [2, { d: undefined, c: 3 }] })).toBe(canonical({ a: [2, { c: 3 }], b: 1 }));
  });

  it("editing record t breaks t and every later fingerprint, none before", () => {
    const edited = tamperSample(f.blocks, stateIdx, 0, { alt: f.blocks[stateIdx].body.samples[0].alt + 0.5 });
    const chain = buildChain(edited);
    expect(firstMismatch(chain, f.anchoredHashes)).toBe(stateIdx);
    for (let i = 0; i < N; i++) {
      if (i < stateIdx) expect(chain[i]).toBe(f.anchoredHashes[i]);
      else expect(chain[i]).not.toBe(f.anchoredHashes[i]);
    }
    const v = verify(edited, f.anchoredHashes, f.anchors);
    expect(v.ok).toBe(false);
    expect(v.firstBad).toBe(stateIdx);
    expect(v.badAnchorSeq).not.toBeNull(); // the next sealed segment head no longer matches 0G Chain
  });

  it("tampering works on a copy; the original is untouched", () => {
    const before = JSON.stringify(f.blocks);
    tamper(f.blocks, 3, (r) => (r.type = "FORGED"));
    expect(JSON.stringify(f.blocks)).toBe(before);
  });

  it("a deleted record is caught at the gap", () => {
    const cut = f.blocks.filter((_, i) => i !== 7);
    expect(verify(cut, f.anchoredHashes, f.anchors)).toMatchObject({ ok: false, firstBad: 7 });
  });

  it("maps a usable flight path from the telemetry", () => {
    expect(f.path.length).toBeGreaterThan(20);
    for (let i = 1; i < f.path.length; i++) expect(f.path[i].t).toBeGreaterThan(f.path[i - 1].t);
  });
});
