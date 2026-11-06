"use client";
// One cube per real sealed record, strung along the recorded trail (specs/05-uiux.md 7.8). Verified = HDR cyan.
// After an edit, red cascades from the edited record to the last one (6.12), then the copy's verdict flips to fail.
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useUI } from "@/lib/store";
import { cascadeK, VERDICT_AT_S } from "@/lib/telemetry";
import { X } from "@/lib/tokens";

const OK = new THREE.Color(X.cyan).multiplyScalar(2.2);
const BAD = new THREE.Color(X.danger).multiplyScalar(2.2);
const LIFT = 0.32; // cubes ride just above the trail
const PICK = new THREE.Color("#ffffff").multiplyScalar(2.4);

export function HashChain({ curve, count, onPick }: { curve: THREE.Curve<THREE.Vector3>; count: number; onPick?: (i: number) => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Color(), []);
  const dirty = useRef(false);
  const shown = useRef<number | null>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.16, 0.16, 0.28), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => () => void (geo.dispose(), mat.dispose()), [geo, mat]);

  // place once per flight
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const ahead = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      curve.getPointAt(u, d.position);
      d.position.y += LIFT;
      curve.getPointAt(Math.min(1, u + 1 / count), ahead);
      ahead.y += LIFT;
      d.lookAt(ahead);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, OK);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [curve, count]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const st = useUI.getState();
    if (st.tamperIndex === null || st.tamperClock === null) {
      if (dirty.current || shown.current !== st.selected) {
        for (let i = 0; i < count; i++) m.setColorAt(i, i === st.selected ? PICK : OK);
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        dirty.current = false;
        shown.current = st.selected;
      }
      return;
    }
    const now = performance.now() / 1000 - st.tamperClock;
    for (let i = st.tamperIndex; i < count; i++) m.setColorAt(i, tmp.lerpColors(OK, BAD, cascadeK(i, st.tamperIndex, count, now)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    dirty.current = true;
    if (now > VERDICT_AT_S && st.verdict !== "fail") st.setVerdict("fail");
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geo, mat, count]}
      onPointerDown={(e) => {
        if (!onPick || e.instanceId === undefined) return;
        e.stopPropagation();
        onPick(e.instanceId);
      }}
    />
  );
}
