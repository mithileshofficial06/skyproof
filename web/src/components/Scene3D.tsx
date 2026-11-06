"use client";
// The 3D simulation view. World rebuilt from the signed permit + recorded scene, in daylight.
// Sim coordinates: metres on a 1:50 city block (x east, y north, alt up) -> three.js (x, alt, -y).
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls, Sky, Text as DreiText, useGLTF } from "@react-three/drei";
import { type ComponentProps, memo, type MutableRefObject, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
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
    t.anisotropy = 4;
    return t;
  }, []);
}

function Building({ b, facade }: { b: { x: number; y: number; w: number; d: number; h: number; c: string }; facade: THREE.Texture | null }) {
  const mats = useMemo(() => {
    const side = (len: number) => {
      const t = facade?.clone() ?? null;
      if (t) {
        t.needsUpdate = true;
        t.repeat.set(Math.max(1, Math.round(len * 5)), Math.max(1, Math.round(b.h * 3.2)));
      }
      return new THREE.MeshStandardMaterial({ color: b.c, map: t, roughness: 0.75 });
    };
    const roof = new THREE.MeshStandardMaterial({ color: "#7b7f86", roughness: 0.9 });
    return [side(b.d), side(b.d), roof, roof, side(b.w), side(b.w)];
  }, [b, facade]);
  return (
    <group position={v(b.x, b.y, 0)}>
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow material={mats}>
        <boxGeometry args={[b.w, b.h, b.d]} />
      </mesh>
      <mesh position={[b.w * 0.18, b.h + 0.03, -b.d * 0.15]} castShadow>
        <boxGeometry args={[b.w * 0.25, 0.06, b.d * 0.25]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
    </group>
  );
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
  const g = bounds(permit.geofence);
  const { blocks, trees } = useMemo(() => {
    const r = rand(42);
    const blocks: { x: number; y: number; w: number; d: number; h: number; c: string }[] = [];
    const palette = ["#d6d0c4", "#c9c2b4", "#b9b3a8", "#e3ddd2", "#a8a49c", "#cfc6b6"];
    for (let x = g.x0 - 3; x <= g.x1 + 3; x += 1.1)
      for (let y = g.y0 - 3; y <= g.y1 + 3; y += 1.1) {
        if (x > g.x0 - 0.9 && x < g.x1 + 0.9 && y > g.y0 - 0.9 && y < g.y1 + 0.9) continue;
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++)
          blocks.push({ x: x + (r() - 0.5) * 0.45, y: y + (r() - 0.5) * 0.45, w: 0.28 + r() * 0.3, d: 0.28 + r() * 0.3, h: 0.25 + r() * 1.5, c: palette[Math.floor(r() * palette.length)] });
      }
    const trees: XY[] = [];
    for (let i = 0; i < 60; i++) {
      const p: XY = [g.x0 + r() * (g.x1 - g.x0), g.y0 + r() * (g.y1 - g.y0)];
      const near = (q: XY, d: number) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d;
      if (permit.noFly.some((z) => inPoly(p, z.polygon))) continue;
      if (Object.values(permit.dropZones).some((q) => near(q, 0.7)) || Object.values(permit.rallyPoints).some((q) => near(q, 0.5))) continue;
      if (Math.abs(p[1] - 0.15) < 0.55 || Math.abs(p[0] - 3.5) < 0.55 || Math.abs(p[1] - 3.0) < 0.45 || Math.abs(p[1] - 0.95) < 0.3 || near([0.65, 1.75], 0.5)) continue;
      trees.push(p);
    }
    return { blocks, trees };
  }, [g.x0, g.x1, g.y0, g.y1, permit]);

  const cx = (g.x0 + g.x1) / 2;
  const cy = (g.y0 + g.y1) / 2;
  const ring = [...permit.geofence, permit.geofence[0]].map(([x, y]) => v(x, y, 0.012));
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, -0.002)} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#cbc5b8" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.001)} receiveShadow>
        <planeGeometry args={[g.x1 - g.x0 + 1.6, g.y1 - g.y0 + 1.6]} />
        <meshStandardMaterial color="#4a4d52" roughness={0.95} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const horiz = i < 2;
        const len = horiz ? g.x1 - g.x0 + 1.4 : g.y1 - g.y0 + 1.4;
        const fixed = horiz ? (i === 0 ? g.y0 - 0.4 : g.y1 + 0.4) : i === 2 ? g.x0 - 0.4 : g.x1 + 0.4;
        return Array.from({ length: Math.floor(len / 0.3) }).map((_, k) => (
          <mesh key={`${i}-${k}`} rotation-x={-Math.PI / 2} rotation-z={horiz ? 0 : Math.PI / 2} position={v(horiz ? g.x0 - 0.55 + k * 0.3 : fixed, horiz ? fixed : g.y0 - 0.55 + k * 0.3, 0.003)}>
            <planeGeometry args={[0.14, 0.018]} />
            <meshBasicMaterial color="#e8e2c9" />
          </mesh>
        ));
      })}
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.004)} receiveShadow>
        <planeGeometry args={[g.x1 - g.x0, g.y1 - g.y0]} />
        <meshStandardMaterial color="#8fae6f" roughness={1} />
      </mesh>
      <Line points={ring} color="#0f766e" lineWidth={2} dashed dashSize={0.12} gapSize={0.07} />
      <Text position={v(g.x0 + 0.05, g.y0 - 0.12, 0.014)} rotation-x={-Math.PI / 2} fontSize={0.1} color="#0f3d3a" anchorX="left">
        {`PERMITTED AREA · CEILING ${permit.altCeilingM} M`}
      </Text>
      {blocks.map((b, i) => (
        <Building key={i} b={b} facade={facade} />
      ))}
      {/* sidewalk kerb around the park */}
      <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.003)}>
        <planeGeometry args={[g.x1 - g.x0 + 0.16, g.y1 - g.y0 + 0.16]} />
        <meshStandardMaterial color="#d8d2c5" />
      </mesh>
      {/* street lamps */}
      {Array.from({ length: 24 }).map((_, i) => {
        const side = i % 4;
        const k = Math.floor(i / 4) / 5;
        const [x, y] = side === 0 ? [g.x0 + k * (g.x1 - g.x0), g.y0 - 0.1] : side === 1 ? [g.x1 + 0.1, g.y0 + k * (g.y1 - g.y0)] : side === 2 ? [g.x1 - k * (g.x1 - g.x0), g.y1 + 0.1] : [g.x0 - 0.1, g.y1 - k * (g.y1 - g.y0)];
        return (
          <group key={i} position={v(x, y, 0)}>
            <mesh position={[0, 0.11, 0]} castShadow>
              <cylinderGeometry args={[0.005, 0.007, 0.22, 6]} />
              <meshStandardMaterial color="#3f4248" />
            </mesh>
            <mesh position={[0, 0.225, 0]}>
              <boxGeometry args={[0.035, 0.012, 0.02]} />
              <meshStandardMaterial color="#2b2e33" />
            </mesh>
          </group>
        );
      })}
      <Traffic g={g} />
      {/* pond + paths in the park */}
      <mesh rotation-x={-Math.PI / 2} position={v(0.65, 1.75, 0.006)}>
        <circleGeometry args={[0.32, 40]} />
        <meshStandardMaterial color="#5b8fa8" roughness={0.15} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v(0.65, 1.75, 0.0055)}>
        <circleGeometry args={[0.36, 40]} />
        <meshStandardMaterial color="#cdbf9f" />
      </mesh>
      {[
        [[0.0, 0.25], [0.65, 1.4]],
        [[0.65, 2.1], [0.6, 2.7]],
        [[3.5, 0.6], [3.45, 2.85]],
      ].map(([a, b], i) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} rotation-z={Math.atan2(b[1] - a[1], b[0] - a[0])} position={v((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.005)}>
            <planeGeometry args={[len, 0.07]} />
            <meshStandardMaterial color="#d6cbb0" />
          </mesh>
        );
      })}
      {trees.map((p, i) => (
        <Tree key={i} xy={p} i={i} />
      ))}
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
              <meshStandardMaterial color="#9a9da3" />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 4} position={v(cx, cy, 0.008)}>
              <planeGeometry args={[w * 1.3, 0.24]} />
              <meshStandardMaterial color="#3d4046" />
            </mesh>
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={i} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 4} position={v(cx + (i - 3.5) * 0.15 * Math.SQRT1_2, cy + (i - 3.5) * 0.15 * Math.SQRT1_2, 0.01)}>
                <planeGeometry args={[0.07, 0.016]} />
                <meshBasicMaterial color="#f5f5f4" />
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
              <meshStandardMaterial color="#e9c46a" roughness={0.9} />
            </mesh>
            {Object.keys(spots).length > 1 &&
              Object.entries(spots).map(([k, [sx, sy]]) => (
                <group key={k}>
                  <mesh rotation-x={-Math.PI / 2} position={v(sx, sy, 0.011)}>
                    <planeGeometry args={[0.15, 0.15]} />
                    <meshStandardMaterial color="#fffbeb" />
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
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={v(x, y, 0.01)}>
            <ringGeometry args={[0.13, 0.145, 32]} />
            <meshBasicMaterial color="#f8fafc" />
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

function Tree({ xy, i }: { xy: XY; i: number }) {
  const s = 0.85 + (i % 5) * 0.08;
  if (i % 3 === 0)
    return (
      <group position={v(xy[0], xy[1], 0)} scale={s}>
        <mesh position={[0, 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.026, 0.14, 7]} />
          <meshStandardMaterial color="#5b4030" />
        </mesh>
        {[[0.2, 0.24, 0.18], [0.16, 0.2, 0.33], [0.11, 0.17, 0.46]].map(([r, h, y], k) => (
          <mesh key={k} position={[0, y, 0]} castShadow>
            <coneGeometry args={[r, h, 9]} />
            <meshStandardMaterial color={["#2f5d34", "#386b3c", "#417944"][k]} roughness={0.95} />
          </mesh>
        ))}
      </group>
    );
  return (
    <group position={v(xy[0], xy[1], 0)} scale={s}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 0.26, 7]} />
        <meshStandardMaterial color="#6b4a33" />
      </mesh>
      {[[0, 0.36, 0, 0.15], [0.08, 0.31, 0.04, 0.11], [-0.07, 0.32, -0.03, 0.115], [0.01, 0.45, -0.02, 0.1]].map(([x, y, z, r], k) => (
        <mesh key={k} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 2]} />
          <meshStandardMaterial color={["#4f7f3a", "#5a8c41", "#46743a", "#679948"][(k + i) % 4]} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

type Shared = MutableRefObject<{ pos: THREE.Vector3; heading: number }>;

function Drone({ drone: droneProp, fx, shared, getDrone }: { drone: DroneView; fx: SceneFx; shared: Shared; getDrone?: () => DroneView | null }) {
  const { scene } = useGLTF("/models/drone.glb");
  // The rotor meshes are authored around the model origin, so re-centre each one on its own hub
  // (fresh geometry copy) so it spins in place instead of orbiting the body.
  const { model, fit, rotors, discs } = useMemo(() => {
    const m = scene.clone(true);
    const rotors: THREE.Mesh[] = [];
    const discs: THREE.Mesh[] = [];
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
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
      m.add(disc);
      discs.push(disc);
    });
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    m.position.set(-ctr.x, -ctr.y, -ctr.z);
    holder.add(m);
    return { model: holder, fit: 0.42 / Math.max(size.x, size.z, 1e-6), rotors, discs };
  }, [scene]);
  const spin = useRef(0);
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const tgt = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    if (!g.current || !body.current) return;
    const drone = getDrone?.() ?? droneProp;
    tgt.current.set(...v(drone.pos[0], drone.pos[1], drone.alt));
    if (getDrone) g.current.position.copy(tgt.current); // already interpolated
    else g.current.position.lerp(tgt.current, Math.min(1, dt * 10));
    const [vx, vy] = drone.vel;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.12) shared.current.heading = Math.atan2(vy, vx); // ignore hover jitter
    // turn the shortest way round, bank into turns, pitch with speed
    let dh = shared.current.heading - g.current.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.current.rotation.y += dh * Math.min(1, dt * 3);
    body.current.rotation.z = THREE.MathUtils.lerp(body.current.rotation.z, -Math.min(0.28, speed * 0.32), Math.min(1, dt * 3));
    body.current.rotation.x = THREE.MathUtils.lerp(body.current.rotation.x, THREE.MathUtils.clamp(dh * 0.6, -0.25, 0.25), Math.min(1, dt * 3));
    const air = drone.alt > 0.08;
    spin.current = THREE.MathUtils.lerp(spin.current, air ? 1 : 0.08, Math.min(1, dt * 1.5));
    for (const r of rotors) r.rotation.y += dt * 75 * spin.current;
    for (const d of discs) (d.material as THREE.MeshBasicMaterial).opacity = Math.max(0, spin.current - 0.35) * 0.3;
    body.current.position.y = air ? Math.sin(state.clock.elapsedTime * 3) * 0.004 : 0;
    shared.current.pos.copy(g.current.position);
    if (shadow.current) {
      shadow.current.position.set(0, -g.current.position.y + 0.006, 0);
      const s = 1 / (1 + g.current.position.y * 0.6);
      shadow.current.scale.set(s, s, s);
    }
  });

  const tone = TONE[droneProp.status];
  return (
    <group ref={g}>
      <group ref={body}>
        <group scale={fit}>
          <primitive object={model} />
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
          <mesh position={[0, -0.3, 0]}>
            <coneGeometry args={[0.32, 0.55, 24, 1, true]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {fx.safeStop && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
          <ringGeometry args={[0.24, 0.27, 40]} />
          <meshBasicMaterial color="#b45309" />
        </mesh>
      )}
      {fx.label && (
        <Html position={[0, 0.32, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ minWidth: 200, background: "#fffdf8", border: "1px solid #e3ded3", borderLeft: `4px solid ${tone}`, borderRadius: 6, padding: "7px 10px", fontFamily: "var(--font-geist-sans), system-ui", boxShadow: "0 6px 18px rgba(20,22,26,0.14)" }}>
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

// Camera: starts wide, flies in, then follows behind and slightly to the side of the drone.
function CameraRig({ shared, follow, focus }: { shared: Shared; follow: boolean; focus?: [number, number, number] | null }) {
  const look = useRef(new THREE.Vector3(1.9, 0, -1.8));
  const camHeading = useRef(0);
  const damp = (cur: THREE.Vector3, to: THREE.Vector3, lambda: number, dt: number) => {
    cur.x = THREE.MathUtils.damp(cur.x, to.x, lambda, dt);
    cur.y = THREE.MathUtils.damp(cur.y, to.y, lambda, dt);
    cur.z = THREE.MathUtils.damp(cur.z, to.z, lambda, dt);
  };
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // no jumps after a slow frame
    if (focus) {
      // close-up on what is about to happen, seen from the drone's side
      const f = new THREE.Vector3(...v(focus[0], focus[1], focus[2]));
      const d = shared.current.pos.clone().sub(f).setY(0);
      if (d.lengthSq() < 0.01) d.set(-1, 0, 1);
      d.normalize();
      const desired = f.clone().addScaledVector(d, 2.3).add(new THREE.Vector3(0.6, 1.3, 0.4));
      damp(state.camera.position, desired, 1.1, dt);
      damp(look.current, f, 1.6, dt);
      state.camera.lookAt(look.current);
      return;
    }
    if (!follow) return;
    const p = shared.current.pos;
    // the camera turns slowly towards the drone's heading (shortest way round)
    let dh = shared.current.heading - camHeading.current;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    camHeading.current += dh * (1 - Math.exp(-0.7 * dt));
    const h = camHeading.current;
    const back = new THREE.Vector3(-Math.cos(h), 0, Math.sin(h));
    const side = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
    const desired = p.clone().addScaledVector(back, 1.25).addScaledVector(side, 0.45).add(new THREE.Vector3(0, 0.62, 0));
    desired.y = Math.max(desired.y, 0.35);
    damp(state.camera.position, desired, 1.3, dt);
    damp(look.current, p.clone().addScaledVector(back, -0.35), 2.2, dt);
    state.camera.lookAt(look.current);
  });
  return null;
}

const CityM = memo(City);
const AirportM = memo(Airport);
const ZonesM = memo(Zones);

export default function Scene3D({ permit, drone, trail, people, props, fx = {}, follow = true, compact, focus, getDrone }: SceneProps) {
  const shared = useRef({ pos: new THREE.Vector3(...v(drone.pos[0], drone.pos[1], drone.alt)), heading: 0 });
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [1.9, 7.5, 5.5], fov: compact ? 38 : 42, near: 0.05, far: 60 }} gl={{ antialias: true, logarithmicDepthBuffer: true }}>
      <Sky sunPosition={[6, 4, 2]} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} />
      <fog attach="fog" args={["#dfe7ec", 10, 30]} />
      <hemisphereLight args={["#f1f5f9", "#8a7f6c", 0.75]} />
      <directionalLight position={[6, 9, 4]} intensity={2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
      <Suspense fallback={null}>
        <CityM permit={permit} />
        <AirportM permit={permit} />
        <ZonesM permit={permit} />
        {props.map((p, i) => (p.kind === "crane" ? <Crane key={i} tower={p.tower!} boomEndX={p.boomEndX!} boomZ={p.boomZ!} /> : <Sign key={i} xy={p.xy!} text={p.text ?? ""} />))}
        {people.map((p, i) => (
          <Person key={`${p.xy[0]}-${p.xy[1]}-${i}`} xy={p.xy} i={i} walk={p.role === "crowd"} shirt={p.role === "crowd" ? SHIRTS[i % SHIRTS.length] : "#b91c1c"} />
        ))}
        <Trail trail={trail} permit={permit} />
        {fx.dropped && <Package pos={fx.dropped.pos} k={fx.dropped.k} />}
        <Drone drone={drone} fx={fx} shared={shared} getDrone={getDrone} />
        {fx.gust && <Gust shared={shared} />}
        {fx.beamTo && <Beam to={fx.beamTo} shared={shared} />}
      </Suspense>
      <CameraRig shared={shared} follow={follow} focus={focus} />
      {!follow && !focus && <OrbitControls target={[1.9, 0.2, -1.8]} maxPolarAngle={Math.PI / 2.15} minDistance={1} maxDistance={14} enableDamping />}
    </Canvas>
  );
}
