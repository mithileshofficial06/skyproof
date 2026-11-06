// Real flight path -> scene points for the Two Truths group (specs/05-uiux.md 6.1, 6.11; 05a D4), and the
// hash-cascade timing (6.12). Pure functions, unit-tested.
import * as THREE from "three";
import type { PathPoint } from "./data/types";
import { clamp, easeOutCubic, smoothstep } from "./math";

export const TRUTHS_SIZE = 8; // scene units across (the spec's 36 would overflow the camera's view here)
export const ALT_EXAG = 1.2; // altitude stretched a little before fitting, so altitude lies are visible

/** sim metres (x east, y north, alt up) -> three (x, alt, -y), centred on the ground, fitted to `size` */
export function pathPoints(path: PathPoint[], size = TRUTHS_SIZE, exag = ALT_EXAG): THREE.Vector3[] {
  if (!path.length) return [];
  const raw = path.map((p) => new THREE.Vector3(p.x, p.alt * exag, -p.y));
  const box = new THREE.Box3().setFromPoints(raw);
  const ext = box.getSize(new THREE.Vector3());
  const s = size / Math.max(ext.x, ext.z, 1e-6);
  const centre = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  const out: THREE.Vector3[] = [];
  const minGap = size * 0.004; // drop hover duplicates: zero-length spans break centripetal splines
  for (const v of raw) {
    const p = v.sub(centre).multiplyScalar(s);
    if (!out.length || out[out.length - 1].distanceTo(p) > minGap) out.push(p);
  }
  if (out.length === 1) out.push(out[0].clone().add(new THREE.Vector3(minGap, 0, 0)));
  return out;
}

// hash cascade (6.12)
export const CASCADE_S = 1.2;
export const RAMP_S = 0.25;
export const VERDICT_AT_S = CASCADE_S + RAMP_S + 0.2;

/** how red block i is, `now` seconds after record t was edited (0 = verified cyan, 1 = broken red) */
export function cascadeK(i: number, t: number, n: number, now: number) {
  if (i < t) return 0;
  const tau = ((i - t) / Math.max(1, n - 1 - t)) * CASCADE_S;
  return easeOutCubic((now - tau) / RAMP_S);
}

/** how far the claimed trail splits off, in scene units (6.11) */
export const divergence = (delta: number, range: number) => clamp(Math.abs(delta) / range, 0.15, 1) * 2.5;

/** black-box capsule: how much of it has materialised at a scroll position (Problem section, spec Section 8) */
export const sealedAt = (scroll: number) => smoothstep(0.1, 0.2, scroll) * 1.02;
