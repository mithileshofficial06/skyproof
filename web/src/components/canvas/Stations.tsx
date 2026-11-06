"use client";
// The three stations along the route (specs/05-uiux.md 7.10; honest semantics per 05a D14):
//  0G ring      : particles stream into a ring (decided + recorded).
//  Chainlink gate: colour follows the store verdict, i.e. the verification of the copy on screen (idle/pending/pass/fail).
//  Arc pulse    : USDC flows to the payout node per the SEALED flight's real payment status (paid / held / none);
//                 an edited copy never changes it, because the judge reads the sealed record.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { storyCurve } from "@/lib/flight-curve";
import { useUI } from "@/lib/store";
import { X } from "@/lib/tokens";

const UP = new THREE.Vector3(0, 1, 0);
/** a point beside the route at u, `side` units to the left, `dy` up */
function beside(u: number, side: number, dy: number) {
  const p = storyCurve.getPointAt(u);
  const t = storyCurve.getTangentAt(u);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(t.x, 0, t.z).normalize(), UP);
  return p.addScaledVector(right, -side).add(new THREE.Vector3(0, dy, 0));
}
const hdr = (c: string, k: number) => new THREE.Color(c).multiplyScalar(k);

function ZeroGRing() {
  const at = useMemo(() => beside(0.6, 2.4, 0.4), []);
  const N = 70;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -2.2, 2.5), new THREE.Vector3(0, -0.4, 1.2), new THREE.Vector3(0, 0, 0)), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = mesh.current;
    if (m) {
      for (let i = 0; i < N; i++) {
        const s = (i / N + t * 0.25) % 1; // 6.16: s_i = fract(i/N + speed*time)
        curve.getPoint(s, tmp);
        const th = i * 2.399 + t * 2 + s * 6;
        const r = 0.35 * (1 - s);
        d.position.set(tmp.x + Math.cos(th) * r, tmp.y + Math.sin(th) * r * 0.4, tmp.z + Math.sin(th) * r);
        d.scale.setScalar(0.5 + 0.5 * Math.sin(s * Math.PI));
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    if (ring.current) ring.current.rotation.z = t * 0.4;
  });
  return (
    <group position={at}>
      <mesh ref={ring}>
        <torusGeometry args={[0.9, 0.03, 16, 128]} />
        <meshBasicMaterial color={hdr(X.zg, 2.6)} toneMapped={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.15, 0.008, 8, 128]} />
        <meshBasicMaterial color={hdr(X.zg, 1.4)} toneMapped={false} transparent opacity={0.6} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={hdr(X.zg, 3)} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

const GATE = { idle: "#5b6673", pending: X.amber, pass: X.pass, fail: X.danger } as const;

function ChainlinkGate() {
  const at = useMemo(() => beside(0.74, 2.4, -0.2), []);
  const g = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: hdr(GATE.idle, 1.6), toneMapped: false }), []);
  const target = useMemo(() => new THREE.Color(), []);
  const failAt = useRef<number | null>(null);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const v = useUI.getState().verdict;
    target.set(GATE[v]).multiplyScalar(v === "pending" ? 1.6 + Math.sin(t * 8) * 0.6 : 2.2);
    mat.color.lerp(target, 1 - Math.exp(-6 * dt));
    if (v === "fail" && failAt.current === null) failAt.current = t;
    if (v !== "fail") failAt.current = null;
    if (g.current) g.current.position.x = failAt.current === null ? 0 : 0.05 * Math.sin(2 * Math.PI * 8 * (t - failAt.current)) * Math.exp(-6 * (t - failAt.current));
    if (scan.current) scan.current.position.y = 0.2 + 1.3 * (0.5 + 0.5 * Math.sin(t * 1.6));
  });
  return (
    <group position={at}>
      <group ref={g}>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} position={[x, 0.8, 0]} material={mat}>
            <boxGeometry args={[0.1, 1.9, 0.1]} />
          </mesh>
        ))}
        <mesh position={[0, 1.78, 0]} material={mat}>
          <boxGeometry args={[1.6, 0.08, 0.1]} />
        </mesh>
        <mesh ref={scan}>
          <boxGeometry args={[1.4, 0.015, 0.02]} />
          <meshBasicMaterial color={hdr(X.chainlink, 3)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function ArcPulse() {
  const from = useMemo(() => beside(0.74, 2.4, 0.6), []);
  const to = useMemo(() => beside(0.86, 2.6, 0.2), []);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.6, 0)), to), [from, to]);
  const N = 36;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const node = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const status = useUI.getState().flight?.arc.status ?? "none";
    const speed = status === "paid" ? 0.35 : status === "held" ? 0.08 : 0;
    const m = mesh.current;
    if (m) {
      for (let i = 0; i < N; i++) {
        const s = speed ? (i / N + t * speed) % 1 : i / N;
        curve.getPoint(s, d.position);
        d.scale.setScalar(speed ? 1 : 0.5);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    if (node.current) node.current.color.set(status === "paid" ? X.pass : status === "held" ? X.amber : X.arc).multiplyScalar(2 + (speed ? Math.sin(t * 4) * 0.4 : 0));
  });
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={hdr(X.arc, 2.6)} toneMapped={false} />
      </instancedMesh>
      <mesh position={to}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshBasicMaterial ref={node} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Stations() {
  return (
    <>
      <ZeroGRing />
      <ChainlinkGate />
      <ArcPulse />
    </>
  );
}
