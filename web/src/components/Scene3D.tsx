"use client";
// The 3D simulation view. World rebuilt from the signed permit + recorded scene, in daylight.
// Sim coordinates: metres on a 1:50 city block (x east, y north, alt up) -> three.js (x, alt, -y).
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Environment, Html, Lightformer, Line, OrbitControls, PerformanceMonitor, Sky, Text as DreiText, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { type ComponentProps, memo, type MutableRefObject, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Permit, Person, Prop, XY } from "@/lib/flight";

const v = (x: number, y: number, alt = 0): [number, number, number] => [x, alt, -y];
const FONT = "/fonts/NotoSans-Regular.ttf"; // bundled: never wait on a CDN
const Text = (p: ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...p} />;

export type Tone = "ok" | "deny" | "warn" | "breach" | "info";
const TONE: Record<Tone, string> = { ok: "#0f766e", info: "#334155", deny: "#b91c1c", warn: "#b45309", breach: "#b91c1c" };

export interface DroneView {
  pos: XY;
  alt: number;
  vel: [number, number, number];
  status: Tone;
}

export interface SceneFx {
  label?: { title: string; sub?: string; tone: Tone; tag?: string };
  scan?: boolean;
  beamTo?: [number, number, number] | null;
  gust?: boolean;
  carrying?: boolean;
  dropped?: { pos: XY; k: number } | null;
  safeStop?: boolean;
}

export interface SceneProps {
  permit: Permit;
  drone: DroneView;
  trail: { pos: XY; alt: number }[];
  people: Person[];
  props: Prop[];
  fx?: SceneFx;
  follow?: boolean;
  compact?: boolean;
  focus?: [number, number, number] | null; // sim x, y, alt: cinematic close-up target
  getDrone?: () => DroneView | null; // live: read the interpolated drone every frame instead of props
}

function inPoly([x, y]: XY, poly: XY[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const bounds = (poly: XY[]) => {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// Facade texture (drawn once): rows of windows, some lit.
function useFacade() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 64, 128);
    const r = rand(7);
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        const lit = r() < 0.18;
        x.fillStyle = lit ? "#f3d9a4" : r() < 0.5 ? "#6d7a86" : "#7f8c97";
        x.fillRect(5 + col * 15, 6 + row * 15, 10, 9);
      }
    x.fillStyle = "rgba(0,0,0,0.08)";
    for (let row = 0; row < 8; row++) x.fillRect(0, 17 + row * 15, 64, 2);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

// Static scenery is baked into a couple of merged meshes: ~800 draw calls become 2, so the
// frame rate stays steady while the drone flies.
const WHITE_UV: [number, number] = [0.03, 0.985]; // a plain white texel of the facade texture
type Part = { geo: THREE.BufferGeometry; at: [number, number, number]; rot?: [number, number, number]; scale?: number; color: string; keepUv?: boolean };
function bake(parts: Part[]) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const geos = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    p.geo.dispose();
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(m.compose(new THREE.Vector3(...p.at), q.setFromEuler(e.set(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3().setScalar(p.scale ?? 1)));
    const n = g.attributes.position.count;
    if (!g.attributes.color) {
      c.set(p.color);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) c.toArray(col, i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    }
    if (!p.keepUv) {
      const uv = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) uv.set(WHITE_UV, i * 2);
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    }
    return g;
  });
  const out = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  return out;
}
// ground layers sit millimetres apart: a depth offset per layer stops them fighting (the old flicker)
const deck = (k: number) => ({ polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -k * 2 });

type Block = { x: number; y: number; w: number; d: number; h: number; c: string };
function buildingGeo(b: Block) {
  const g = new THREE.BoxGeometry(b.w, b.h, b.d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const col = new Float32Array(24 * 3);
  const wall = new THREE.Color(b.c);
  const roof = new THREE.Color("#7b7f86");
  for (let i = 0; i < 24; i++) {
    const face = Math.floor(i / 4); // +x, -x, +y (roof), -y, +z, -z
    if (face === 2 || face === 3) {
      uv.setXY(i, ...WHITE_UV);
      roof.toArray(col, i * 3);
      continue;
    }
    const len = face < 2 ? b.d : b.w;
    uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(len * 5)), uv.getY(i) * Math.max(1, Math.round(b.h * 3.2)));
    wall.toArray(col, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function treeParts(p: XY, i: number): Part[] {
  const s = 0.85 + (i % 5) * 0.08;
  const [X, , Z] = v(p[0], p[1]);
  const at = (x: number, y: number, z: number): [number, number, number] => [X + x * s, y * s, Z + z * s];
  if (i % 3 === 0)
    return [
      { geo: new THREE.CylinderGeometry(0.018, 0.026, 0.14, 7), at: at(0, 0.07, 0), scale: s, color: "#5b4030" },
      ...[[0.2, 0.24, 0.18], [0.16, 0.2, 0.33], [0.11, 0.17, 0.46]].map(([r, h, y], k) => ({ geo: new THREE.ConeGeometry(r, h, 9), at: at(0, y, 0), scale: s, color: ["#2f5d34", "#386b3c", "#417944"][k] })),
    ];
  return [
    { geo: new THREE.CylinderGeometry(0.02, 0.03, 0.26, 7), at: at(0, 0.13, 0), scale: s, color: "#6b4a33" },
    ...[[0, 0.36, 0, 0.15], [0.08, 0.31, 0.04, 0.11], [-0.07, 0.32, -0.03, 0.115], [0.01, 0.45, -0.02, 0.1]].map(([x, y, z, r], k) => ({ geo: new THREE.IcosahedronGeometry(r, 2), at: at(x, y, z), scale: s, color: ["#4f7f3a", "#5a8c41", "#46743a", "#679948"][(k + i) % 4] })),
  ];
}

// Grass texture (drawn once): speckled so the park doesn't read as a flat green sheet.
function useGrass() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#8fae6f";
    x.fillRect(0, 0, 128, 128);
    const r = rand(11);
    for (let i = 0; i < 1600; i++) {
      const l = 0.84 + r() * 0.28;
      x.fillStyle = `rgb(${Math.round(143 * l)},${Math.round(174 * l)},${Math.round(111 * l)})`;
      x.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

const CAR_COLORS = ["#b91c1c", "#1d4ed8", "#f5f5f4", "#111827", "#ca8a04", "#0f766e", "#6b7280", "#7c2d12"];
function Traffic({ g }: { g: { x0: number; x1: number; y0: number; y1: number } }) {
  const ref = useRef<THREE.Group>(null);
  const loop = useMemo(() => {
    const a = { x0: g.x0 - 0.4, x1: g.x1 + 0.4, y0: g.y0 - 0.4, y1: g.y1 + 0.4 };
    const w = a.x1 - a.x0;
    const h = a.y1 - a.y0;
    return { a, w, h, per: 2 * (w + h) };
  }, [g.x0, g.x1, g.y0, g.y1]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const { a, w, h, per } = loop;
    ref.current.children.forEach((car, i) => {
      const lane = i % 2 ? 0.09 : -0.09;
      const dir = i % 2 ? -1 : 1;
      let d = (((clock.elapsedTime * 0.35 * dir + (i * per) / 10) % per) + per) % per;
      let x: number, y: number, rot: number;
      if (d < w) [x, y, rot] = [a.x0 + d, a.y0 + lane, 0];
      else if ((d -= w) < h) [x, y, rot] = [a.x1 - lane, a.y0 + d, Math.PI / 2];
      else if ((d -= h) < w) [x, y, rot] = [a.x1 - d, a.y1 - lane, Math.PI];
      else [x, y, rot] = [a.x0 + lane, a.y1 - (d - w), -Math.PI / 2];
      car.position.set(...v(x, y, 0));
      car.rotation.y = rot + (dir < 0 ? Math.PI : 0);
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i}>
          <mesh position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[0.16, 0.04, 0.075]} />
            <meshStandardMaterial color={CAR_COLORS[i % CAR_COLORS.length]} metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[-0.01, 0.062, 0]} castShadow>
            <boxGeometry args={[0.08, 0.03, 0.065]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function City({ permit }: { permit: Permit }) {
  const facade = useFacade();
  const grass = useGrass();
  const g = bounds(permit.geofence);
  const { solid, decals } = useMemo(() => {
    const r = rand(42);
    const solid: Part[] = [];
    const decals: Part[] = [];
    const palette = ["#d6d0c4", "#c9c2b4", "#b9b3a8", "#e3ddd2", "#a8a49c", "#cfc6b6"];
    for (let x = g.x0 - 3; x <= g.x1 + 3; x += 1.1)
      for (let y = g.y0 - 3; y <= g.y1 + 3; y += 1.1) {
        if (x > g.x0 - 0.9 && x < g.x1 + 0.9 && y > g.y0 - 0.9 && y < g.y1 + 0.9) continue;
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const b: Block = { x: x + (r() - 0.5) * 0.45, y: y + (r() - 0.5) * 0.45, w: 0.28 + r() * 0.3, d: 0.28 + r() * 0.3, h: 0.25 + r() * 1.5, c: palette[Math.floor(r() * palette.length)] };
          const [X, , Z] = v(b.x, b.y);
          solid.push({ geo: buildingGeo(b), at: [X, b.h / 2, Z], color: b.c, keepUv: true });
          solid.push({ geo: new THREE.BoxGeometry(b.w * 0.25, 0.06, b.d * 0.25), at: [X + b.w * 0.18, b.h + 0.03, Z - b.d * 0.15], color: "#9ca3af" });
        }
      }
    let ti = 0;
    for (let i = 0; i < 60; i++) {
      const p: XY = [g.x0 + r() * (g.x1 - g.x0), g.y0 + r() * (g.y1 - g.y0)];
      const near = (q: XY, d: number) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d;
      if (permit.noFly.some((z) => inPoly(p, z.polygon))) continue;
      if (Object.values(permit.dropZones).some((q) => near(q, 0.7)) || Object.values(permit.rallyPoints).some((q) => near(q, 0.5))) continue;
      if (Math.abs(p[1] - 0.15) < 0.55 || Math.abs(p[0] - 3.5) < 0.55 || Math.abs(p[1] - 3.0) < 0.45 || Math.abs(p[1] - 0.95) < 0.3 || near([0.65, 1.75], 0.5)) continue;
      solid.push(...treeParts(p, ti++));
    }
    // street lamps
    for (let i = 0; i < 24; i++) {
      const side = i % 4;
      const k = Math.floor(i / 4) / 5;
      const [x, y] = side === 0 ? [g.x0 + k * (g.x1 - g.x0), g.y0 - 0.1] : side === 1 ? [g.x1 + 0.1, g.y0 + k * (g.y1 - g.y0)] : side === 2 ? [g.x1 - k * (g.x1 - g.x0), g.y1 + 0.1] : [g.x0 - 0.1, g.y1 - k * (g.y1 - g.y0)];
      const [X, , Z] = v(x, y);
      solid.push({ geo: new THREE.CylinderGeometry(0.005, 0.007, 0.22, 6), at: [X, 0.11, Z], color: "#3f4248" });
      solid.push({ geo: new THREE.BoxGeometry(0.035, 0.012, 0.02), at: [X, 0.225, Z], color: "#2b2e33" });
    }
    // lane markings on the ring road
    for (let i = 0; i < 4; i++) {
      const horiz = i < 2;
      const len = horiz ? g.x1 - g.x0 + 1.4 : g.y1 - g.y0 + 1.4;
      const fixed = horiz ? (i === 0 ? g.y0 - 0.4 : g.y1 + 0.4) : i === 2 ? g.x0 - 0.4 : g.x1 + 0.4;
      for (let k = 0; k < Math.floor(len / 0.3); k++)
        decals.push({ geo: new THREE.PlaneGeometry(0.14, 0.018), at: v(horiz ? g.x0 - 0.55 + k * 0.3 : fixed, horiz ? fixed : g.y0 - 0.55 + k * 0.3, 0.003), rot: [-Math.PI / 2, 0, horiz ? 0 : Math.PI / 2], color: "#e8e2c9" });
    }
    // park paths
    for (const [a, b] of [
      [[0.0, 0.25], [0.65, 1.4]],
      [[0.65, 2.1], [0.6, 2.7]],
      [[3.5, 0.6], [3.45, 2.85]],
    ]) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      decals.push({ geo: new THREE.PlaneGeometry(len, 0.07), at: v((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.005), rot: [-Math.PI / 2, 0, Math.atan2(b[1] - a[1], b[0] - a[0])], color: "#d6cbb0" });
    }
    return { solid: bake(solid), decals: bake(decals) };
  }, [g.x0, g.x1, g.y0, g.y1, permit]);
  useEffect(() => () => {
    solid.dispose();
    decals.dispose();
  }, [solid, decals]);
  useEffect(() => {
    grass?.repeat.set((g.x1 - g.x0) * 1.6, (g.y1 - g.y0) * 1.6);
  }, [grass, g.x0, g.x1, g.y0, g.y1]);

  const cx = (g.x0 + g.x1) / 2;
  const cy = (g.y0 + g.y1) / 2;
  const ring = [...permit.geofence, permit.geofence[0]].map(([x, y]) => v(x, y, 0.012));
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, -0.002)} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#c9c3b5" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.001)} receiveShadow>
        <planeGeometry args={[g.x1 - g.x0 + 1.6, g.y1 - g.y0 + 1.6]} />
        <meshStandardMaterial color="#4a4d52" roughness={0.9} {...deck(1)} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.003)} receiveShadow>
        <planeGeometry args={[g.x1 - g.x0 + 0.16, g.y1 - g.y0 + 0.16]} />
        <meshStandardMaterial color="#d8d2c5" {...deck(2)} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.004)} receiveShadow>
        <planeGeometry args={[g.x1 - g.x0, g.y1 - g.y0]} />
        <meshStandardMaterial color="#ffffff" map={grass} roughness={1} {...deck(3)} />
      </mesh>
      <mesh geometry={decals} receiveShadow>
        <meshStandardMaterial vertexColors map={facade} roughness={1} {...deck(5)} />
      </mesh>
      {/* pond */}
      <mesh rotation-x={-Math.PI / 2} position={v(0.65, 1.75, 0.0055)} receiveShadow>
        <circleGeometry args={[0.36, 48]} />
        <meshStandardMaterial color="#cdbf9f" {...deck(4)} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v(0.65, 1.75, 0.006)}>
        <circleGeometry args={[0.32, 48]} />
        <meshStandardMaterial color="#4f86a0" roughness={0.06} metalness={0.35} envMapIntensity={1.4} {...deck(6)} />
      </mesh>
      <Line points={ring} color="#0f766e" lineWidth={2} dashed dashSize={0.12} gapSize={0.07} />
      <Text position={v(g.x0 + 0.05, g.y0 - 0.12, 0.014)} rotation-x={-Math.PI / 2} fontSize={0.1} color="#0f3d3a" anchorX="left">
        {`PERMITTED AREA · CEILING ${permit.altCeilingM} M`}
      </Text>
      <mesh geometry={solid} castShadow receiveShadow>
        <meshStandardMaterial vertexColors map={facade} roughness={0.8} />
      </mesh>
      <Traffic g={g} />
    </group>
  );
}

function Airport({ permit }: { permit: Permit }) {
  return (
    <>
      {permit.noFly.map((z) => {
        const b = bounds(z.polygon);
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        const w = b.x1 - b.x0;
        const d = b.y1 - b.y0;
        const h = permit.altCeilingM + 0.25;
        return (
          <group key={z.name}>
            <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.006)} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#9a9da3" {...deck(4)} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 4} position={v(cx, cy, 0.008)}>
              <planeGeometry args={[w * 1.3, 0.24]} />
              <meshStandardMaterial color="#3d4046" {...deck(5)} />
            </mesh>
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={i} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 4} position={v(cx + (i - 3.5) * 0.15 * Math.SQRT1_2, cy + (i - 3.5) * 0.15 * Math.SQRT1_2, 0.01)}>
                <planeGeometry args={[0.07, 0.016]} />
                <meshBasicMaterial color="#f5f5f4" {...deck(6)} />
              </mesh>
            ))}
            <mesh position={v(cx, cy, h / 2)}>
              <boxGeometry args={[w, h, d]} />
              <meshBasicMaterial color="#dc2626" transparent opacity={0.1} depthWrite={false} />
              <Edges color="#991b1b" />
            </mesh>
            <mesh position={v(cx + w * 0.3, cy + d * 0.3, 0.32)} castShadow>
              <cylinderGeometry args={[0.045, 0.06, 0.64, 12]} />
              <meshStandardMaterial color="#e7e5e4" />
            </mesh>
            <mesh position={v(cx + w * 0.3, cy + d * 0.3, 0.68)} castShadow>
              <cylinderGeometry args={[0.1, 0.075, 0.09, 12]} />
              <meshStandardMaterial color="#1e3a5f" metalness={0.4} roughness={0.3} />
            </mesh>
            <Text position={v(cx, cy, h + 0.08)} fontSize={0.12} color="#7f1d1d" anchorX="center">
              {`NO-FLY ZONE · ${z.name}`}
            </Text>
          </group>
        );
      })}
    </>
  );
}

function Zones({ permit }: { permit: Permit }) {
  return (
    <>
      {Object.entries(permit.dropZones).map(([name, [x, y]]) => {
        const spots = permit.dropSpots?.[name] ?? {};
        const xs = Object.values(spots).map((s) => s[0]);
        const halfX = Math.max(0.25, xs.length ? (Math.max(...xs) - Math.min(...xs)) / 2 + 0.2 : 0.25);
        return (
          <group key={name}>
            <mesh rotation-x={-Math.PI / 2} position={v(x, y, 0.008)} receiveShadow>
              <planeGeometry args={[halfX * 2, 0.5]} />
              <meshStandardMaterial color="#e9c46a" roughness={0.9} {...deck(6)} />
            </mesh>
            {Object.keys(spots).length > 1 &&
              Object.entries(spots).map(([k, [sx, sy]]) => (
                <group key={k}>
                  <mesh rotation-x={-Math.PI / 2} position={v(sx, sy, 0.011)}>
                    <planeGeometry args={[0.15, 0.15]} />
                    <meshStandardMaterial color="#fffbeb" {...deck(7)} />
                  </mesh>
                  <Text rotation-x={-Math.PI / 2} position={v(sx, sy, 0.013)} fontSize={0.11} color="#1c1917" anchorX="center" anchorY="middle">
                    {k}
                  </Text>
                </group>
              ))}
            <Text position={v(x, y - 0.36, 0.014)} rotation-x={-Math.PI / 2} fontSize={0.085} color="#713f12" anchorX="center">
              {`DROP ZONE ${name}`}
            </Text>
          </group>
        );
      })}
      {Object.entries(permit.rallyPoints).map(([name, [x, y]]) => (
        <group key={name}>
          <mesh rotation-x={-Math.PI / 2} position={v(x, y, 0.008)}>
            <circleGeometry args={[0.16, 32]} />
            <meshStandardMaterial color="#334155" {...deck(6)} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={v(x, y, 0.01)}>
            <ringGeometry args={[0.13, 0.145, 32]} />
            <meshBasicMaterial color="#f8fafc" {...deck(7)} />
          </mesh>
          <Text rotation-x={-Math.PI / 2} position={v(x, y, 0.012)} fontSize={0.13} color="#f8fafc" anchorX="center" anchorY="middle">
            H
          </Text>
          <Text rotation-x={-Math.PI / 2} position={v(x, y - 0.24, 0.012)} fontSize={0.07} color="#1e293b" anchorX="center">
            {name}
          </Text>
        </group>
      ))}
    </>
  );
}

function Crane({ tower, boomEndX, boomZ }: { tower: XY; boomEndX: number; boomZ: number }) {
  const [tx, ty] = tower;
  const len = boomEndX - tx;
  const n = Math.max(3, Math.round(len / 0.15));
  return (
    <group>
      <mesh position={v(tx, ty, (boomZ + 0.3) / 2)} castShadow>
        <boxGeometry args={[0.08, boomZ + 0.3, 0.08]} />
        <meshStandardMaterial color="#e0a526" roughness={0.6} />
        <Edges color="#7c5410" />
      </mesh>
      {[-0.19, 0.19].map((dz) => (
        <mesh key={dz} position={v(tx + len / 2, ty, boomZ + dz)} castShadow>
          <boxGeometry args={[len, 0.025, 0.06]} />
          <meshStandardMaterial color="#e0a526" />
        </mesh>
      ))}
      {Array.from({ length: n }).map((_, i) => (
        <Line key={i} points={[v(tx + (len * i) / n, ty, boomZ - 0.19), v(tx + (len * (i + 1)) / n, ty, boomZ + 0.19)]} color="#b7841c" lineWidth={1.6} />
      ))}
      <mesh position={v(tx - 0.22, ty, boomZ + 0.15)} castShadow>
        <boxGeometry args={[0.36, 0.1, 0.1]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <Line points={[v(tx + len * 0.7, ty, boomZ - 0.19), v(tx + len * 0.7, ty, 0.3)]} color="#57534e" lineWidth={1} />
      <mesh position={v(tx + len * 0.7, ty, 0.28)} castShadow>
        <boxGeometry args={[0.06, 0.05, 0.06]} />
        <meshStandardMaterial color="#44403c" />
      </mesh>
    </group>
  );
}

function Sign({ xy, text }: { xy: XY; text: string }) {
  return (
    <group position={v(xy[0], xy[1], 0)}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.24]} />
        <meshStandardMaterial color="#57534e" />
      </mesh>
      <mesh position={[0, 0.27, 0]} castShadow>
        <boxGeometry args={[0.36, 0.22, 0.01]} />
        <meshStandardMaterial color="#fafaf9" />
      </mesh>
      <Text position={[0, 0.27, 0.007]} fontSize={0.04} color="#b91c1c" anchorX="center" anchorY="middle" maxWidth={0.32} textAlign="center" lineHeight={1.15}>
        {text.split(" / ").join("\n")}
      </Text>
    </group>
  );
}

const SHIRTS = ["#c2410c", "#1d4ed8", "#7c3aed", "#047857", "#be185d", "#0e7490"];
const SKIN = ["#c99a72", "#8d5a3b", "#e2b48f", "#a8714c"];
const PANTS = ["#1f2937", "#334155", "#44403c", "#1e3a5f"];
function Person({ xy, shirt, i, walk }: { xy: XY; shirt: string; i: number; walk: boolean }) {
  const root = useRef<THREE.Group>(null);
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const k = clock.elapsedTime * (walk ? 5 : 1.2) + i * 1.7;
    const sw = walk ? Math.sin(k) * 0.5 : Math.sin(k) * 0.05;
    if (lLeg.current) lLeg.current.rotation.x = sw;
    if (rLeg.current) rLeg.current.rotation.x = -sw;
    if (lArm.current) lArm.current.rotation.x = -sw * 0.8;
    if (rArm.current) rArm.current.rotation.x = sw * 0.8;
    if (root.current) {
      root.current.rotation.y = walk ? clock.elapsedTime * 0.25 + i : Math.sin(clock.elapsedTime * 0.3 + i) * 0.5;
      root.current.position.y = walk ? Math.abs(Math.sin(k)) * 0.006 : 0;
    }
  });
  const skin = SKIN[i % SKIN.length];
  const pants = PANTS[i % PANTS.length];
  // ~0.30 units tall: shorter than trees (~0.6) and buildings, a bit taller than the drone is wide
  return (
    <group position={v(xy[0], xy[1], 0)}>
      <group ref={root}>
        {[-1, 1].map((sd) => (
          <group key={sd} ref={sd < 0 ? lLeg : rLeg} position={[sd * 0.022, 0.13, 0]}>
            <mesh position={[0, -0.065, 0]} castShadow>
              <capsuleGeometry args={[0.016, 0.1, 3, 8]} />
              <meshStandardMaterial color={pants} />
            </mesh>
            <mesh position={[0, -0.125, 0.01]}>
              <boxGeometry args={[0.03, 0.015, 0.045]} />
              <meshStandardMaterial color="#1c1917" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.185, 0]} castShadow>
          <capsuleGeometry args={[0.04, 0.07, 3, 10]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
        {[-1, 1].map((sd) => (
          <group key={sd} ref={sd < 0 ? lArm : rArm} position={[sd * 0.052, 0.225, 0]}>
            <mesh position={[0, -0.05, 0]} castShadow>
              <capsuleGeometry args={[0.012, 0.075, 3, 8]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color={skin} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.262, 0]}>
          <cylinderGeometry args={[0.012, 0.014, 0.02, 8]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, 0.292, 0]} castShadow>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, 0.305, -0.004]}>
          <sphereGeometry args={[0.031, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={i % 2 ? "#1c1917" : "#57351f"} />
        </mesh>
      </group>
    </group>
  );
}

type Shared = MutableRefObject<{ pos: THREE.Vector3; heading: number }>;

// Soft round texture: blob shadow under the drone and glow sprites.
function useRadial() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d")!;
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.45, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
}

const ZG_PURPLE = new THREE.Color("#7c5cff");

function Drone({ drone: droneProp, fx, shared, getDrone }: { drone: DroneView; fx: SceneFx; shared: Shared; getDrone?: () => DroneView | null }) {
  const { scene } = useGLTF("/models/drone.glb");
  const radial = useRadial();
  // The rotor meshes are authored around the model origin, so re-centre each one on its own hub
  // (fresh geometry copy) so it spins in place instead of orbiting the body.
  const { model, fit, rotors, discs, navs } = useMemo(() => {
    const m = scene.clone(true);
    const rotors: THREE.Mesh[] = [];
    const discs: THREE.Mesh[] = [];
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 1.3;
      if (!/^Rotor_/.test(mesh.name)) return;
      mesh.geometry = mesh.geometry.clone();
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      const c = bb.getCenter(new THREE.Vector3());
      const r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
      mesh.geometry.translate(-c.x, -c.y, -c.z);
      mesh.position.copy(c);
      rotors.push(mesh);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: "#2f3338", transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(c);
      mesh.parent?.add(disc);
      discs.push(disc);
    });
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    m.position.set(-ctr.x, -ctr.y, -ctr.z);
    holder.add(m);
    holder.updateMatrixWorld(true);
    const fit = 0.42 / Math.max(size.x, size.z, 1e-6);
    // navigation lights under each rotor: red front-left, green front-right, white strobes at the back
    const navs = rotors.map((r) => {
      const p = r.getWorldPosition(new THREE.Vector3()).multiplyScalar(fit);
      p.y -= 0.012;
      const kind: "red" | "green" | "strobe" = p.x > 0 ? (p.z < 0 ? "red" : "green") : "strobe";
      return { p, kind };
    });
    return { model: holder, fit, rotors, discs, navs };
  }, [scene]);
  const spin = useRef(0);
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const strobes = useRef<THREE.Group>(null);
  const scanCone = useRef<THREE.Mesh>(null);
  const uplink = useRef<THREE.Group>(null);
  const tgt = useRef(new THREE.Vector3());

  useFrame((state, rawDt) => {
    if (!g.current || !body.current) return;
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const drone = getDrone?.() ?? droneProp;
    tgt.current.set(...v(drone.pos[0], drone.pos[1], drone.alt));
    if (getDrone) g.current.position.copy(tgt.current); // already smoothed
    else g.current.position.lerp(tgt.current, 1 - Math.exp(-12 * dt));
    const [vx, vy] = drone.vel;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.12) shared.current.heading = Math.atan2(vy, vx); // ignore hover jitter
    // turn the shortest way round, pitch with speed, roll into turns
    let dh = shared.current.heading - g.current.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.current.rotation.y += dh * (1 - Math.exp(-3 * dt));
    body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, -Math.min(0.28, speed * 0.32), 3, dt);
    body.current.rotation.x = THREE.MathUtils.damp(body.current.rotation.x, THREE.MathUtils.clamp(dh * 0.6, -0.25, 0.25), 3, dt);
    const air = drone.alt > 0.08;
    spin.current = THREE.MathUtils.damp(spin.current, air ? 1 : 0.08, 1.5, dt);
    for (const r of rotors) r.rotation.y += dt * 75 * spin.current;
    for (const d of discs) (d.material as THREE.MeshBasicMaterial).opacity = Math.max(0, spin.current - 0.35) * 0.3;
    body.current.position.y = air ? Math.sin(t * 3) * 0.004 : 0;
    shared.current.pos.copy(g.current.position);
    const h = g.current.position.y;
    if (shadow.current) {
      shadow.current.position.set(0, -h + 0.008, 0);
      const s = 1 + h * 0.5;
      shadow.current.scale.set(s, s, s);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.42 / (1 + h * 1.4);
    }
    if (ring.current) {
      ring.current.position.set(0, -h + 0.01, 0);
      const pulse = fx.scan ? 1 + ((t * 1.6) % 1) * 0.6 : 1 + Math.sin(t * 2) * 0.04;
      ring.current.scale.setScalar(pulse);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = fx.scan ? 0.75 * (1 - ((t * 1.6) % 1)) : 0.4;
    }
    if (strobes.current) {
      const ph = t % 1.3;
      strobes.current.visible = ph < 0.05 || (ph > 0.13 && ph < 0.18);
    }
    if (scanCone.current) (scanCone.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.06 * Math.sin(t * 9);
    if (uplink.current) {
      // a pulse climbing from the drone: the question going up to 0G
      uplink.current.children.forEach((c, i) => {
        const k = (t * 0.9 + i / 3) % 1;
        c.position.y = 0.15 + k * 2.6;
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      });
    }
  }, -3);

  const tone = TONE[droneProp.status];
  return (
    <group ref={g}>
      <group ref={body}>
        <group scale={fit}>
          <primitive object={model} />
        </group>
        {navs
          .filter((n) => n.kind !== "strobe")
          .map((n, i) => (
            <mesh key={i} position={n.p}>
              <sphereGeometry args={[0.009, 10, 10]} />
              <meshBasicMaterial color={n.kind === "red" ? [6, 0.35, 0.25] : [0.3, 5, 0.9]} toneMapped={false} />
            </mesh>
          ))}
        <group ref={strobes}>
          {navs
            .filter((n) => n.kind === "strobe")
            .map((n, i) => (
              <mesh key={i} position={n.p}>
                <sphereGeometry args={[0.009, 10, 10]} />
                <meshBasicMaterial color={[8, 8, 8]} toneMapped={false} />
              </mesh>
            ))}
        </group>
        {fx.carrying && (
          <group position={[0, -0.09, 0]}>
            <Line points={[[0, 0.05, 0], [0, -0.02, 0]]} color="#57534e" lineWidth={1} />
            <mesh position={[0, -0.045, 0]} castShadow>
              <boxGeometry args={[0.07, 0.05, 0.07]} />
              <meshStandardMaterial color="#b0814f" roughness={0.9} />
            </mesh>
          </group>
        )}
        {fx.scan && (
          <mesh ref={scanCone} position={[0, -0.3, 0]}>
            <coneGeometry args={[0.32, 0.55, 32, 1, true]} />
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      {fx.scan && (
        <group ref={uplink}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.05, 0.065, 32]} />
              <meshBasicMaterial color={ZG_PURPLE.clone().multiplyScalar(3)} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}
      <mesh ref={shadow} rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshBasicMaterial color="#000" alphaMap={radial} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} renderOrder={3}>
        <ringGeometry args={[0.2, 0.218, 64]} />
        <meshBasicMaterial color={tone} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </mesh>
      {fx.safeStop && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
          <ringGeometry args={[0.24, 0.27, 40]} />
          <meshBasicMaterial color="#b45309" />
        </mesh>
      )}
      {fx.label && (
        <Html position={[0, 0.32, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ minWidth: 200, background: "rgba(255,253,248,0.96)", border: "1px solid #e3ded3", borderLeft: `4px solid ${tone}`, borderRadius: 8, padding: "7px 10px", fontFamily: "var(--font-geist-sans), system-ui", boxShadow: "0 8px 24px rgba(20,22,26,0.16)", backdropFilter: "blur(4px)" }}>
            {fx.label.tag && <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b6f76" }}>{fx.label.tag}</div>}
            <div style={{ fontSize: 14, fontWeight: 600, color: "#15171a", whiteSpace: "nowrap" }}>{fx.label.title}</div>
            {fx.label.sub && <div style={{ fontSize: 11.5, color: "#55595f", maxWidth: 260, marginTop: 2 }}>{fx.label.sub}</div>}
          </div>
        </Html>
      )}
    </group>
  );
}
useGLTF.preload("/models/drone.glb");

function Gust({ shared }: { shared: Shared }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.copy(shared.current.pos);
    ref.current.children.forEach((c, i) => {
      c.position.x = ((clock.elapsedTime * 1.4 + i * 0.37) % 1.4) - 0.7;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, ((i % 3) - 1) * 0.12, ((i % 5) - 2) * 0.1]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.003, 0.003, 0.28, 4]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Beam({ to, shared }: { to: [number, number, number]; shared: Shared }) {
  const end = useMemo(() => new THREE.Vector3(...v(to[0], to[1], to[2])), [to]);
  const dot = useRef<THREE.Mesh>(null);
  const line = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = shared.current.pos;
    if (dot.current) dot.current.position.copy(end);
    if (line.current) {
      line.current.position.copy(a.clone().add(end).multiplyScalar(0.5));
      line.current.lookAt(end);
      line.current.scale.set(1, 1, Math.max(0.01, a.distanceTo(end)));
    }
  });
  return (
    <>
      <group ref={line}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
          <meshBasicMaterial color="#b91c1c" />
        </mesh>
      </group>
      <mesh ref={dot}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial color="#b91c1c" />
      </mesh>
    </>
  );
}

function Package({ pos, k }: { pos: XY; k: number }) {
  return (
    <mesh position={v(pos[0], pos[1], Math.max(0.025, 0.45 * (1 - k)))} castShadow rotation-y={k * 2}>
      <boxGeometry args={[0.07, 0.05, 0.07]} />
      <meshStandardMaterial color="#b0814f" roughness={0.9} />
    </mesh>
  );
}

function Trail({ trail, permit }: { trail: { pos: XY; alt: number }[]; permit: Permit }) {
  if (trail.length < 2) return null;
  const pts = trail.map((s) => v(s.pos[0], s.pos[1], s.alt));
  const colors = trail.map((s) => new THREE.Color(permit.noFly.some((z) => inPoly(s.pos, z.polygon)) || !inPoly(s.pos, permit.geofence) || s.alt > permit.altCeilingM ? "#b91c1c" : "#1e3a8a"));
  return (
    <>
      <Line points={pts} vertexColors={colors} lineWidth={2.2} />
      <Line points={trail.map((s) => v(s.pos[0], s.pos[1], 0.016))} color="#1e3a8a" lineWidth={1} transparent opacity={0.25} />
    </>
  );
}

export type CamMode = "chase" | "cinematic" | "top" | "orbit" | "city";
const CAM_MODES: [CamMode, string][] = [
  ["chase", "Chase"],
  ["cinematic", "Cinematic"],
  ["top", "Top"],
  ["orbit", "Orbit"],
  ["city", "City"],
];
type Controls = { target: THREE.Vector3; update(): void };

// Camera: every mode glides (critically damped) so switching never jumps.
// chase = behind the drone · cinematic = slow circle around it · top = overhead
// orbit = drag to look around the drone while it flies · city = free view of the whole map
function CameraRig({ shared, mode, focus, home }: { shared: Shared; mode: CamMode; focus?: [number, number, number] | null; home: THREE.Vector3 }) {
  const look = useRef(new THREE.Vector3(1.9, 0, -1.8));
  const camHeading = useRef(0);
  const angle = useRef(0);
  const last = useRef<THREE.Vector3 | null>(null);
  const since = useRef(0);
  const tmp = useRef(new THREE.Vector3());
  const seen = useRef<Controls | null>(null);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const damp = (cur: THREE.Vector3, to: THREE.Vector3, lambda: number, dt: number) => {
    cur.x = THREE.MathUtils.damp(cur.x, to.x, lambda, dt);
    cur.y = THREE.MathUtils.damp(cur.y, to.y, lambda, dt);
    cur.z = THREE.MathUtils.damp(cur.z, to.z, lambda, dt);
  };
  useEffect(() => {
    since.current = 0;
    last.current = null;
  }, [mode, focus]);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // no jumps after a slow frame
    const cam = state.camera;
    const p = shared.current.pos;
    since.current += dt;
    if (focus) {
      // close-up on what is about to happen, seen from the drone's side
      const f = new THREE.Vector3(...v(focus[0], focus[1], focus[2]));
      const d = p.clone().sub(f).setY(0);
      if (d.lengthSq() < 0.01) d.set(-1, 0, 1);
      d.normalize();
      const desired = f.clone().addScaledVector(d, 2.3).add(new THREE.Vector3(0.6, 1.3, 0.4));
      damp(cam.position, desired, 1.1, dt);
      damp(look.current, f, 1.6, dt);
      cam.lookAt(look.current);
      return;
    }
    if (mode === "orbit" || mode === "city") {
      if (!controls) return;
      if (seen.current !== controls) {
        controls.target.copy(look.current); // new controls start where the camera already looks
        seen.current = controls;
      }
      if (mode === "orbit") {
        // carry the camera along with the drone; the user's drag only changes the angle
        if (last.current) cam.position.add(tmp.current.copy(p).sub(last.current));
        if (since.current < 0.8) damp(controls.target, p, 6, dt);
        else controls.target.copy(p);
        last.current = (last.current ?? new THREE.Vector3()).copy(p);
      } else if (since.current < 2) {
        damp(cam.position, tmp.current.set(home.x + 1.2, 7.2, home.z + 6.2), 2.2, dt);
        damp(controls.target, home, 2.6, dt);
      }
      look.current.copy(controls.target);
      return;
    }
    const desired = tmp.current;
    let lookTo: THREE.Vector3;
    if (mode === "chase") {
      // the camera turns slowly towards the drone's heading (shortest way round)
      let dh = shared.current.heading - camHeading.current;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      camHeading.current += dh * (1 - Math.exp(-0.7 * dt));
      const h = camHeading.current;
      const back = new THREE.Vector3(-Math.cos(h), 0, Math.sin(h));
      const side = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
      desired.copy(p).addScaledVector(back, 1.3).addScaledVector(side, 0.45).add(new THREE.Vector3(0, 0.58, 0));
      desired.y = Math.max(desired.y, 0.35);
      lookTo = p.clone().addScaledVector(back, -0.4);
    } else if (mode === "cinematic") {
      angle.current += dt * 0.2;
      const a = angle.current;
      const r = 1.85 + Math.sin(a * 0.7) * 0.4;
      desired.set(p.x + Math.cos(a) * r, Math.max(0.3, p.y + 0.55 + Math.sin(a * 0.5) * 0.3), p.z + Math.sin(a) * r);
      lookTo = p.clone();
    } else {
      desired.set(p.x, p.y + 4.2, p.z + 0.9);
      lookTo = p.clone();
    }
    damp(cam.position, desired, mode === "top" ? 1.8 : 1.4, dt);
    damp(look.current, lookTo, 2.6, dt);
    cam.lookAt(look.current);
  }, -2);
  return null;
}

const CityM = memo(City);
const AirportM = memo(Airport);
const ZonesM = memo(Zones);
const TrailM = memo(Trail);

export default function Scene3D({ permit, drone, trail, people, props, fx = {}, follow = true, compact, focus, getDrone }: SceneProps) {
  const shared = useRef({ pos: new THREE.Vector3(...v(drone.pos[0], drone.pos[1], drone.alt)), heading: 0 });
  const [mode, setMode] = useState<CamMode>(follow ? "chase" : "city");
  const [hi, setHi] = useState(true); // drops effects and resolution if the machine can't keep up
  useEffect(() => setMode(follow ? "chase" : "city"), [follow]);
  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /input|textarea|select/i.test(el.tagName)) return;
      const k = Number(e.key);
      if (k >= 1 && k <= CAM_MODES.length) setMode(CAM_MODES[k - 1][0]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact]);
  const home = useMemo(() => {
    const g = bounds(permit.geofence);
    return new THREE.Vector3(...v((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, 0.2));
  }, [permit]);
  const free = !focus && (mode === "orbit" || mode === "city");

  return (
    <div className="relative h-full w-full">
      <Canvas shadows="soft" dpr={hi ? [1, 1.75] : 1} camera={{ position: [1.9, 7.5, 5.5], fov: compact ? 38 : 42, near: 0.06, far: 90 }} gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}>
        <PerformanceMonitor onDecline={() => setHi(false)} />
        <Sky sunPosition={[6, 4, 2]} turbidity={5} rayleigh={1.1} mieCoefficient={0.004} mieDirectionalG={0.85} />
        <fog attach="fog" args={["#dde6ec", 12, 34]} />
        <hemisphereLight args={["#eef3f8", "#8a7f6c", 0.4]} />
        <directionalLight position={[6, 9, 4]} intensity={2.3} color="#fff4e2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-0.0002} shadow-normalBias={0.015} shadow-radius={4} />
        <Environment resolution={256} frames={1} environmentIntensity={0.55}>
          <Lightformer form="rect" intensity={1.6} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
          <Lightformer form="rect" intensity={1.3} color="#ffe6c4" position={[8, 3, 4]} scale={[7, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.8} color="#cfe2ff" position={[-8, 2, -5]} scale={[7, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={2} position={[0, 4, -9]} scale={3} target={[0, 0, 0]} />
        </Environment>
        <Suspense fallback={null}>
          <CityM permit={permit} />
          <AirportM permit={permit} />
          <ZonesM permit={permit} />
          {props.map((p, i) => (p.kind === "crane" ? <Crane key={i} tower={p.tower!} boomEndX={p.boomEndX!} boomZ={p.boomZ!} /> : <Sign key={i} xy={p.xy!} text={p.text ?? ""} />))}
          {people.map((p, i) => (
            <Person key={`${p.xy[0]}-${p.xy[1]}-${i}`} xy={p.xy} i={i} walk={p.role === "crowd"} shirt={p.role === "crowd" ? SHIRTS[i % SHIRTS.length] : "#b91c1c"} />
          ))}
          <TrailM trail={trail} permit={permit} />
          {fx.dropped && <Package pos={fx.dropped.pos} k={fx.dropped.k} />}
          <Drone drone={drone} fx={fx} shared={shared} getDrone={getDrone} />
          {fx.gust && <Gust shared={shared} />}
          {fx.beamTo && <Beam to={fx.beamTo} shared={shared} />}
        </Suspense>
        <CameraRig shared={shared} mode={mode} focus={focus} home={home} />
        {free && <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={0.5} maxDistance={16} enableDamping dampingFactor={0.08} />}
        {hi && (
          <EffectComposer multisampling={4} enableNormalPass={false}>
            <Bloom mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={0.2} intensity={0.75} />
            <SMAA />
            <Vignette offset={0.32} darkness={0.42} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
      {!compact && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {free && <span className="rounded-md bg-[#15171a]/70 px-2 py-1 text-[11px] text-[#f4f1ea]">drag to look around · scroll to zoom</span>}
          <div className="flex overflow-hidden rounded-md border border-[#d9d3c6] bg-[#fffdf8]/95 text-xs shadow-sm">
            {CAM_MODES.map(([m, label], i) => (
              <button key={m} title={`${label} camera (key ${i + 1})`} onClick={() => setMode(m)} className={`px-2.5 py-1.5 transition-colors ${mode === m ? "bg-[#15171a] text-[#f4f1ea]" : "text-[#33363b] hover:bg-[#f6f3ec]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
