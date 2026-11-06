// UI-4: camera keys and banking direction.
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { KEYS, KEYS_TALL, sampleCam } from "@/lib/camera-keys";
import { storyCurve } from "@/lib/flight-curve";
import { bankRoll, curvature, MAX_ROLL, poseQuat } from "@/lib/rig";

describe("camera keys", () => {
  it("hits every key exactly at its u", () => {
    for (const k of KEYS) {
      const c = { ...sampleCam(k.u) };
      expect(c.dist).toBeCloseTo(k.dist, 9);
      expect(c.fov).toBeCloseTo(k.fov, 9);
    }
  });
  it("stays between neighbouring keys", () => {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const a = KEYS[i];
      const b = KEYS[i + 1];
      const d = sampleCam((a.u + b.u) / 2).dist;
      expect(d).toBeGreaterThanOrEqual(Math.min(a.dist, b.dist) - 1e-9);
      expect(d).toBeLessThanOrEqual(Math.max(a.dist, b.dist) + 1e-9);
    }
  });
  it("tall screens never shift sideways", () => {
    for (const u of [0, 0.3, 0.55, 0.8, 1]) expect(sampleCam(u, KEYS_TALL).lat).toBe(0);
  });
});

describe("banking", () => {
  const fwd = new THREE.Vector3(0, 0, -1);
  const left = new THREE.Vector3(-0.1, 0, -1).normalize();

  it("a left turn has positive curvature", () => {
    expect(curvature(fwd, left, 0.5)).toBeGreaterThan(0);
    expect(curvature(left, fwd, 0.5)).toBeLessThan(0);
  });

  it("in a left turn the right side rises: the drone leans into the turn", () => {
    const q = poseQuat(fwd, bankRoll(curvature(fwd, left, 0.5)), new THREE.Quaternion(), new THREE.Matrix4(), new THREE.Quaternion());
    const rightWing = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    expect(rightWing.y).toBeGreaterThan(0);
  });

  it("forward stays -Z after posing, and roll is clamped to 28 degrees", () => {
    const q = poseQuat(fwd, 0, new THREE.Quaternion(), new THREE.Matrix4(), new THREE.Quaternion());
    expect(new THREE.Vector3(0, 0, -1).applyQuaternion(q).z).toBeCloseTo(-1, 6);
    expect(Math.abs(bankRoll(100))).toBeCloseTo(MAX_ROLL, 9);
  });

  it("the story path never banks past the limit", () => {
    const t0 = new THREE.Vector3();
    const t1 = new THREE.Vector3();
    const L = storyCurve.getLength();
    for (let u = 0.01; u < 0.99; u += 0.01) {
      storyCurve.getTangentAt(u - 0.004, t0);
      storyCurve.getTangentAt(u + 0.004, t1);
      expect(Math.abs(bankRoll(curvature(t0, t1, L * 0.008)))).toBeLessThanOrEqual(MAX_ROLL + 1e-9);
    }
  });
});
