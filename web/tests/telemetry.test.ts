// UI-5: the real path fits the Two Truths box; cascade timing follows 6.12.
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { toFlightRecord } from "@/lib/data/map";
import type { FlightFile } from "@/lib/flight";
import { cascadeK, CASCADE_S, divergence, pathPoints, RAMP_S, sealedAt, TRUTHS_SIZE, VERDICT_AT_S } from "@/lib/telemetry";

const f = toFlightRecord(JSON.parse(readFileSync(new URL("../public/data/sample-flight.json", import.meta.url), "utf8")) as FlightFile, "replay");

describe("flight path in the scene", () => {
  const pts = pathPoints(f.path);
  it("fits the box, sits on the ground, keeps enough points for a curve", () => {
    const box = new THREE.Box3().setFromPoints(pts);
    const size = box.getSize(new THREE.Vector3());
    expect(Math.max(size.x, size.z)).toBeCloseTo(TRUTHS_SIZE, 6);
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-9);
    expect(pts.length).toBeGreaterThan(10);
  });
  it("has no zero-length spans (they break centripetal splines)", () => {
    for (let i = 1; i < pts.length; i++) expect(pts[i].distanceTo(pts[i - 1])).toBeGreaterThan(0);
    expect(new THREE.CatmullRomCurve3(pts, false, "centripetal").getLength()).toBeGreaterThan(0);
  });
});

describe("hash cascade", () => {
  const N = 52;
  const t = 20;
  it("blocks before the edit never turn red", () => {
    for (let i = 0; i < t; i++) expect(cascadeK(i, t, N, 10)).toBe(0);
  });
  it("the edited block turns first, the last block by the end of the cascade", () => {
    expect(cascadeK(t, t, N, 0)).toBe(0);
    expect(cascadeK(t, t, N, RAMP_S)).toBe(1);
    expect(cascadeK(N - 1, t, N, CASCADE_S - 0.01)).toBe(0);
    expect(cascadeK(N - 1, t, N, CASCADE_S + RAMP_S)).toBe(1);
  });
  it("is monotonic down the chain at any moment", () => {
    for (const now of [0.1, 0.5, 0.9, 1.3]) for (let i = t; i < N - 1; i++) expect(cascadeK(i, t, N, now)).toBeGreaterThanOrEqual(cascadeK(i + 1, t, N, now));
  });
  it("the verdict lands under 1.7 s, the split is bounded", () => {
    expect(VERDICT_AT_S).toBeLessThan(1.7);
    expect(divergence(0, 1)).toBeCloseTo(0.375, 9);
    expect(divergence(99, 1)).toBe(2.5);
  });
});

describe("black box", () => {
  it("is absent in the hero and fully sealed by the end of the Problem section", () => {
    expect(sealedAt(0)).toBe(0);
    expect(sealedAt(0.05)).toBe(0);
    expect(sealedAt(0.2)).toBeGreaterThan(1);
  });
});
