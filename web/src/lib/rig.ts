// Coordinated-turn banking (specs/05-uiux.md 6.6, 6.7): tan(phi) = v^2 kappa / g, clamped.
// Sign convention, proven in tests/rig.test.ts: in a LEFT turn the drone's right side rises (it leans into the turn).
// (The spec's sketch used -phi; with three's lookAt basis, local +Z points backward, so +phi is the inward lean.)
import * as THREE from "three";

export const BANK_GAIN = 4.5;
export const MAX_ROLL = THREE.MathUtils.degToRad(28);

/** curvature from two unit tangents ds apart; left turn (towards -X when flying -Z) is positive */
export const curvature = (t0: THREE.Vector3, t1: THREE.Vector3, ds: number) => (t0.z * t1.x - t0.x * t1.z) / (ds || 1);

export const bankRoll = (kappa: number, gain = BANK_GAIN, max = MAX_ROLL) => THREE.MathUtils.clamp(Math.atan(gain * kappa), -max, max);

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Vector3();

/** orientation: local -Z along `forward`, then roll about local Z. Writes into `out`. */
export function poseQuat(forward: THREE.Vector3, roll: number, out: THREE.Quaternion, m: THREE.Matrix4, qr: THREE.Quaternion) {
  m.lookAt(ZERO, forward, UP);
  out.setFromRotationMatrix(m);
  qr.setFromAxisAngle(Z, roll);
  return out.multiply(qr);
}
