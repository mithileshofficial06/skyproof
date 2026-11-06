// specs/05-uiux.md 12.1: geo, quantization and motion maths.
import { describe, expect, it } from "vitest";
import { q, toENU } from "@/lib/geo";
import { damp, easeOutCubic, smoothDamp, smoothstep } from "@/lib/math";

describe("geo", () => {
  it("toENU is (0, alt, 0) at the origin", () => {
    const [e, a, n] = toENU(19.07, 72.87, 30, 19.07, 72.87);
    expect(e).toBeCloseTo(0, 9);
    expect(a).toBe(30);
    expect(n).toBeCloseTo(0, 9);
  });
  it("+1 degree of latitude is about 111 km north (scene -z)", () => {
    const [, , z] = toENU(20.07, 72.87, 0, 19.07, 72.87);
    expect(-z / 1000).toBeGreaterThan(110.5);
    expect(-z / 1000).toBeLessThan(111.8);
  });
  it("quantized lat/lon fit int32 and heading stays in [0, 35999]", () => {
    for (const d of [-180, -90, 0, 90, 180]) expect(Math.abs(q.deg(d))).toBeLessThanOrEqual(2 ** 31 - 1);
    for (const h of [-720, -0.001, 0, 359.999, 360, 1234.5]) {
      expect(q.hdg(h)).toBeGreaterThanOrEqual(0);
      expect(q.hdg(h)).toBeLessThanOrEqual(35999);
    }
  });
});

describe("motion maths", () => {
  it("damp is frame-rate independent: two steps of dt/2 equal one step of dt", () => {
    for (const [x, y, l, dt] of [[0, 1, 4.5, 1 / 60], [3, -2, 5, 0.05], [10, 10.5, 1.3, 0.2]]) {
      expect(Math.abs(damp(damp(x, y, l, dt / 2), y, l, dt / 2) - damp(x, y, l, dt))).toBeLessThan(1e-9);
    }
  });
  it("smoothDamp never overshoots a step", () => {
    for (const st of [0.05, 0.2, 0.6]) {
      let x = 0;
      const v = { v: 0 };
      for (let i = 0; i < 600; i++) {
        x = smoothDamp(x, 1, v, st, 1 / 60);
        expect(x).toBeLessThanOrEqual(1);
      }
      expect(x).toBeCloseTo(1, 3);
    }
  });
  it("smoothstep and easeOutCubic hit their ends", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });
});
