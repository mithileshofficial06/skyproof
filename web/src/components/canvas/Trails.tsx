"use client";
// The two truths as tubes (specs/05-uiux.md 6.10, 6.11, 7.7): the RECORDED trail (sealed on 0G, glowing cyan) and the
// CLAIMED trail (a pale ghost on top of it). They draw in with the scroll. After an edit the claimed trail bends away
// from the edit point onwards, in the vertex shader (static geometry, animated uniforms, nothing allocated per frame).
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { smoothstep } from "@/lib/math";
import { useUI } from "@/lib/store";
import { divergence } from "@/lib/telemetry";
import { X } from "@/lib/tokens";

export function makeTube(curve: THREE.Curve<THREE.Vector3>, segs = 400, radius = 0.03, radial = 8) {
  const geo = new THREE.TubeGeometry(curve, segs, radius, radial, false);
  const frames = curve.computeFrenetFrames(segs, false);
  const dir = new Float32Array(geo.attributes.position.count * 3);
  let k = 0;
  for (let i = 0; i <= segs; i++) {
    const b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      dir[k++] = b.x;
      dir[k++] = b.y;
      dir[k++] = b.z;
    }
  }
  geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3)); // vertex order is i-major: (segs+1)*(radial+1)
  return geo;
}

const vert = /* glsl */ `
uniform float uDiverge, uDelta, uS0, uW;
attribute vec3 aDir;
varying float vS;
void main() {
  vS = uv.x;
  float k = smoothstep(uS0, uS0 + uW, uv.x);
  vec3 p = position + aDir * uDelta * uDiverge * k;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const frag = /* glsl */ `
uniform float uReveal, uDiverge, uS0, uW, uGlow, uAlpha;
uniform vec3 uBase, uAlert;
varying float vS;
void main() {
  if (vS > uReveal) discard;
  float k = uDiverge * smoothstep(uS0, uS0 + uW, vS);
  gl_FragColor = vec4(mix(uBase, uAlert, k) * uGlow, uAlpha);
}`;

function trailMaterial(base: string, glow: number, alpha: number) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: alpha < 1,
    depthWrite: alpha >= 1,
    toneMapped: false,
    uniforms: {
      uReveal: { value: 0 },
      uDiverge: { value: 0 },
      uDelta: { value: 0 },
      uS0: { value: 0 },
      uW: { value: 0.12 },
      uGlow: { value: glow },
      uAlpha: { value: alpha },
      uBase: { value: new THREE.Color(base) },
      uAlert: { value: new THREE.Color(X.danger) },
    },
  });
}

/** reveal window inside the Two Truths section (scroll u, spec Section 8) */
const REVEAL_FROM = 0.24;
const REVEAL_TO = 0.38;

export function Trails({ curve, blocks }: { curve: THREE.Curve<THREE.Vector3>; blocks: number }) {
  const geo = useMemo(() => ({ recorded: makeTube(curve, 400, 0.05), claimed: makeTube(curve, 400, 0.028) }), [curve]);
  const mats = useMemo(() => ({ recorded: trailMaterial(X.cyan, 2.0, 1), claimed: trailMaterial(X.ghost, 1.0, 0.9) }), []);
  useEffect(() => () => void (geo.recorded.dispose(), geo.claimed.dispose()), [geo]);
  useEffect(() => () => void (mats.recorded.dispose(), mats.claimed.dispose()), [mats]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const { scroll, tamperIndex, tamperDelta } = useUI.getState();
    const reveal = smoothstep(REVEAL_FROM, REVEAL_TO, scroll) * 1.001;
    const r = mats.recorded.uniforms;
    const c = mats.claimed.uniforms;
    r.uReveal.value = THREE.MathUtils.damp(r.uReveal.value, reveal, 6, dt);
    c.uReveal.value = r.uReveal.value;
    const target = tamperIndex === null ? 0 : 1;
    c.uDiverge.value = THREE.MathUtils.damp(c.uDiverge.value, target, 4, dt);
    if (tamperIndex !== null) {
      c.uS0.value = tamperIndex / Math.max(1, blocks);
      c.uDelta.value = divergence(tamperDelta, 1);
    }
  });

  return (
    <group>
      <mesh geometry={geo.recorded} material={mats.recorded} />
      <mesh geometry={geo.claimed} material={mats.claimed} renderOrder={2} />
    </group>
  );
}
