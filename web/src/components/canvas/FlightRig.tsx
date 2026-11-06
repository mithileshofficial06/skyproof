"use client";
// Flies the drone along the story path with the scroll, banks it into turns and drives the follow camera
// (specs/05-uiux.md 7.4, 6.4, 6.6, 6.7, 6.15). The camera is yaw-only, so it never rolls. No per-frame allocation.
import { useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";
import { KEYS_TALL, KEYS_WIDE, sampleCam } from "@/lib/camera-keys";
import { STORY_LENGTH, storyCurve, TRUTHS_RANGE, truthsFocus } from "@/lib/flight-curve";
import { smoothstep } from "@/lib/math";
import { bankRoll, curvature, poseQuat } from "@/lib/rig";
import { useUI } from "@/lib/store";

const UP = new THREE.Vector3(0, 1, 0);

export function FlightRig({ children }: { children: (climb: { current: number }) => ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const climb = useRef(0);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const wide = useThree((s) => s.size.width / s.size.height > 1);
  const s = useMemo(
    () => ({ u: 0, roll: 0, p: new THREE.Vector3(), t0: new THREE.Vector3(), t1: new THREE.Vector3(), f: new THREE.Vector3(), yaw: new THREE.Vector3(), right: new THREE.Vector3(), desired: new THREE.Vector3(), look: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), qr: new THREE.Quaternion(), cam: { dist: 0, h: 0, lat: 0, look: 0, fov: 0 }, placed: false }),
    [],
  );

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 20);
    const D = THREE.MathUtils.damp;
    s.u = D(s.u, useUI.getState().scroll, 4.5, dt);
    const u = THREE.MathUtils.clamp(s.u, 0, 1);
    const e = 0.004;
    const ua = Math.max(0, u - e);
    const ub = Math.min(1, u + e);
    storyCurve.getPointAt(u, s.p);
    storyCurve.getTangentAt(ua, s.t0);
    storyCurve.getTangentAt(ub, s.t1);
    s.f.copy(s.t0).add(s.t1).normalize();
    climb.current = s.f.y * 4; // rotor speed follows the climb rate

    s.roll = D(s.roll, bankRoll(curvature(s.t0, s.t1, STORY_LENGTH * (ub - ua))), 5, dt);
    poseQuat(s.f, s.roll, s.q, s.m, s.qr);
    g.position.copy(s.p);
    if (!s.placed) g.quaternion.copy(s.q);
    else g.quaternion.slerp(s.q, 1 - Math.exp(-8 * dt));

    // follow camera: yaw-only forward, keyframed distance / height / side / look-ahead / fov
    s.yaw.set(s.f.x, 0, s.f.z).normalize();
    s.right.crossVectors(s.yaw, UP);
    const k = sampleCam(u, wide ? KEYS_WIDE : KEYS_TALL, s.cam);
    s.desired.copy(s.p).addScaledVector(s.yaw, -k.dist).addScaledVector(s.right, k.lat);
    s.desired.y += k.h;
    if (!s.placed) camera.position.copy(s.desired);
    else camera.position.set(D(camera.position.x, s.desired.x, 3, dt), D(camera.position.y, s.desired.y, 3, dt), D(camera.position.z, s.desired.z, 3, dt));
    s.look.copy(s.p).addScaledVector(s.yaw, k.look);
    // during Two Truths the camera turns to the sealed flight on the floor, then back to the drone
    const [a0, a1, b0, b1] = TRUTHS_RANGE;
    s.look.lerp(truthsFocus, smoothstep(a0, a1, u) * (1 - smoothstep(b0, b1, u)));
    camera.lookAt(s.look);
    if (Math.abs(camera.fov - k.fov) > 0.01) {
      camera.fov = s.placed ? D(camera.fov, k.fov, 3, dt) : k.fov;
      camera.updateProjectionMatrix();
    }
    s.placed = true;
  });

  return <group ref={group}>{children(climb)}</group>;
}
