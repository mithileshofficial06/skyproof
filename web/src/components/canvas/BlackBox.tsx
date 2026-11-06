"use client";
// The orange flight-recorder capsule (specs/05-uiux.md 7.6): materialises out of noise during the Problem section,
// a Fresnel rim, raw HDR output so only its edges bloom; turns red while a tampered copy is on screen.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { storyCurve } from "@/lib/flight-curve";
import { useUI } from "@/lib/store";
import { sealedAt } from "@/lib/telemetry";
import { X } from "@/lib/tokens";

const vert = /* glsl */ `
varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
void main(){ vPos = position; vNormal = normalize(normalMatrix*normal);
  vec4 mv = modelViewMatrix*vec4(position,1.0); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const frag = /* glsl */ `
uniform float uProgress; uniform float uTamper; uniform vec3 uColor; uniform vec3 uAlert;
varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float noise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
void main(){
  float n = noise(vPos*6.0); if (n > uProgress) discard;
  float edge = smoothstep(uProgress-0.06, uProgress, n);
  float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.5);
  vec3 base = mix(uColor, uAlert, uTamper);
  gl_FragColor = vec4(base*(0.25 + fres*1.5) + base*edge*3.0, 1.0);
}`;

/** beside the route in the Problem section; the drone flies on and leaves it behind */
const AT = storyCurve.getPointAt(0.19).add(new THREE.Vector3(1.4, -0.4, 0));

export function BlackBox() {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, toneMapped: false, uniforms: { uProgress: { value: 0 }, uTamper: { value: 0 }, uColor: { value: new THREE.Color(X.capsule) }, uAlert: { value: new THREE.Color(X.danger) } } }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const { scroll, tamperIndex } = useUI.getState();
    const u = mat.uniforms;
    u.uProgress.value = THREE.MathUtils.damp(u.uProgress.value, sealedAt(scroll), 3, dt);
    u.uTamper.value = THREE.MathUtils.damp(u.uTamper.value, tamperIndex === null ? 0 : 1, 6, dt);
    if (g.current) g.current.rotation.y = state.clock.elapsedTime * 0.35;
  });
  return (
    <group ref={g} position={AT} rotation-z={0.35}>
      <mesh material={mat}>
        <capsuleGeometry args={[0.18, 0.5, 8, 24]} />
      </mesh>
    </group>
  );
}
