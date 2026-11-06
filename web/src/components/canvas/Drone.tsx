"use client";
// Procedural quadcopter for /experience (specs/05-uiux.md 7.5, 6.8, 6.9; 05a D8). Forward is -Z.
// Rotors spin in alternating directions (CW, CCW, CCW, CW) and cross-fade from blades to a blur disc once
// they are fast enough to alias; the body bobs on two layered sines. Nothing is allocated per frame.
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { smoothstep } from "@/lib/math";
import { X } from "@/lib/tokens";

const ARM = 0.34; // centre to motor
const MOTORS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
].map(([x, z]) => [(x * ARM) / Math.SQRT2, (z * ARM) / Math.SQRT2]);
const DIR = [1, -1, -1, 1];
const W0 = 2 * Math.PI * 14; // rad/s at hover
const KC = 20; // extra rad/s per unit of climb
const SPIN_UP = 1.8; // s: blades are visible while the rotors spin up

export interface DroneProps {
  /** climb rate, -1..1 (from the flight rig in UI-4) */
  climb?: { current: number };
  scale?: number;
}

export function Drone({ climb, scale = 1 }: DroneProps) {
  const body = useRef<THREE.Group>(null);
  const rotors = useRef<(THREE.Group | null)[]>([]);
  const t0 = useRef<number | null>(null);

  const mats = useMemo(
    () => ({
      shell: new THREE.MeshPhysicalMaterial({ color: "#1a2029", metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 }),
      carbon: new THREE.MeshStandardMaterial({ color: "#0d1117", metalness: 0.35, roughness: 0.55 }),
      metal: new THREE.MeshStandardMaterial({ color: "#8a97a6", metalness: 0.95, roughness: 0.22 }),
      blade: new THREE.MeshStandardMaterial({ color: "#11161d", metalness: 0.2, roughness: 0.6, transparent: true }),
      disc: new THREE.MeshBasicMaterial({ color: "#7d93ab", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      tip: new THREE.MeshBasicMaterial({ color: "#c9d6e3", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      ledFront: new THREE.MeshBasicMaterial({ color: new THREE.Color(X.cyan).multiplyScalar(2.4), toneMapped: false }),
      ledRear: new THREE.MeshBasicMaterial({ color: new THREE.Color(X.danger).multiplyScalar(2.2), toneMapped: false }),
      lens: new THREE.MeshPhysicalMaterial({ color: "#05070a", metalness: 0, roughness: 0.05, clearcoat: 1 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const since = t - t0.current;
    const w = (W0 + KC * (climb?.current ?? 0)) * smoothstep(0, SPIN_UP, since);
    for (let i = 0; i < 4; i++) {
      const r = rotors.current[i];
      if (r) r.rotation.y += DIR[i] * w * dt;
    }
    const disc = smoothstep(30, 70, w);
    mats.blade.opacity = 1 - disc;
    mats.blade.visible = disc < 0.99;
    mats.disc.opacity = 0.1 * disc; // faint body of the blur
    mats.tip.opacity = 0.32 * disc; // the blade tips read as a thin bright rim
    if (body.current) body.current.position.y = 0.03 * Math.sin(2 * Math.PI * 0.4 * t) + 0.012 * Math.sin(2 * Math.PI * 0.92 * t + 1.3);
  });

  return (
    <group scale={scale}>
      <group ref={body}>
        {/* fuselage */}
        <RoundedBox args={[0.3, 0.1, 0.42]} radius={0.04} smoothness={4} material={mats.shell} castShadow />
        <RoundedBox args={[0.22, 0.05, 0.3]} radius={0.02} smoothness={3} position={[0, 0.07, 0.02]} material={mats.carbon} />
        {/* camera gimbal under the nose */}
        <mesh position={[0, -0.07, -0.15]} material={mats.metal}>
          <sphereGeometry args={[0.045, 24, 16]} />
        </mesh>
        <mesh position={[0, -0.075, -0.19]} rotation-x={Math.PI / 2} material={mats.lens}>
          <cylinderGeometry args={[0.022, 0.022, 0.012, 24]} />
        </mesh>
        {/* lights: cyan forward, red aft */}
        <mesh position={[0, 0.005, -0.212]} material={mats.ledFront}>
          <boxGeometry args={[0.2, 0.012, 0.006]} />
        </mesh>
        <mesh position={[0, 0.005, 0.212]} material={mats.ledRear}>
          <boxGeometry args={[0.14, 0.012, 0.006]} />
        </mesh>
        {MOTORS.map(([x, z], i) => (
          <group key={i}>
            {/* arm */}
            <mesh position={[x / 2, 0, z / 2]} rotation-y={Math.atan2(-z, x)} material={mats.carbon}>
              <boxGeometry args={[ARM, 0.025, 0.04]} />
            </mesh>
            {/* motor */}
            <mesh position={[x, 0.025, z]} material={mats.metal}>
              <cylinderGeometry args={[0.032, 0.036, 0.05, 24]} />
            </mesh>
            <mesh position={[x, -0.012, z]} material={i < 2 ? mats.ledFront : mats.ledRear}>
              <cylinderGeometry args={[0.037, 0.037, 0.006, 24]} />
            </mesh>
            {/* rotor: blades + blur disc */}
            <group ref={(g) => void (rotors.current[i] = g)} position={[x, 0.056, z]}>
              <mesh material={mats.blade}>
                <boxGeometry args={[0.3, 0.004, 0.026]} />
              </mesh>
              <mesh material={mats.metal}>
                <cylinderGeometry args={[0.012, 0.012, 0.014, 12]} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} material={mats.disc}>
                <circleGeometry args={[0.15, 40]} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} material={mats.tip}>
                <ringGeometry args={[0.145, 0.155, 48]} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
