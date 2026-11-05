"use client";
// The 3D simulation view. World rebuilt from the signed permit + recorded scene, in daylight.
// Sim coordinates: metres on a 1:50 city block (x east, y north, alt up) -> three.js (x, alt, -y).
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls, Sky, Text as DreiText, useGLTF } from "@react-three/drei";
import { type ComponentProps, type MutableRefObject, Suspense, useMemo, useRef } from "react";
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

function City({ permit }: { permit: Permit }) {
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
    for (let i = 0; i < 70; i++) {
      const p: XY = [g.x0 + r() * (g.x1 - g.x0), g.y0 + r() * (g.y1 - g.y0)];
      const near = (q: XY, d: number) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d;
      if (permit.noFly.some((z) => inPoly(p, z.polygon))) continue;
      if (Object.values(permit.dropZones).some((q) => near(q, 0.7)) || Object.values(permit.rallyPoints).some((q) => near(q, 0.5))) continue;
      if (Math.abs(p[1] - 0.15) < 0.45 || Math.abs(p[0] - 3.5) < 0.45 || Math.abs(p[1] - 3.0) < 0.35) continue;
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
        <group key={i} position={v(b.x, b.y, 0)}>
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} roughness={0.85} />
          </mesh>
          <mesh position={[0, b.h + 0.005, 0]}>
            <boxGeometry args={[b.w * 0.92, 0.01, b.d * 0.92]} />
            <meshStandardMaterial color="#6b6f76" />
          </mesh>
        </group>
      ))}
      {trees.map((p, i) => (
        <group key={i} position={v(p[0], p[1], 0)}>
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.016, 0.1, 6]} />
            <meshStandardMaterial color="#6b4f35" />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <coneGeometry args={[0.07 + (i % 3) * 0.015, 0.2, 8]} />
            <meshStandardMaterial color={i % 2 ? "#4f7a3a" : "#5c8a44"} roughness={1} />
          </mesh>
        </group>
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
function Walker({ xy, shirt, i }: { xy: XY; shirt: string; i: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const k = clock.elapsedTime * 1.6 + i;
    ref.current.rotation.y = Math.sin(k * 0.4) * 0.6;
    ref.current.position.y = Math.abs(Math.sin(k * 2)) * 0.006;
  });
  return (
    <group position={v(xy[0], xy[1], 0)}>
      <group ref={ref}>
        <mesh position={[0, 0.09, 0]} castShadow>
          <capsuleGeometry args={[0.032, 0.11, 4, 10]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.09, 4, 10]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
        <mesh position={[0, 0.31, 0]} castShadow>
          <sphereGeometry args={[0.036, 16, 16]} />
          <meshStandardMaterial color="#c99a72" />
        </mesh>
      </group>
    </group>
  );
}

type Shared = MutableRefObject<{ pos: THREE.Vector3; heading: number }>;

function Drone({ drone, fx, shared }: { drone: DroneView; fx: SceneFx; shared: Shared }) {
  const { scene } = useGLTF("/models/drone.glb");
  const { model, fit } = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -c.y, -c.z);
    return { model: m, fit: 0.42 / Math.max(size.x, size.z, 1e-6) };
  }, [scene]);
  const rotors = useMemo(() => ["Rotor_FL", "Rotor_FR", "Rotor_BL", "Rotor_BR"].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[], [model]);
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const tgt = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    if (!g.current || !body.current) return;
    tgt.current.set(...v(drone.pos[0], drone.pos[1], drone.alt));
    g.current.position.lerp(tgt.current, Math.min(1, dt * 10));
    const [vx, vy] = drone.vel;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.06) shared.current.heading = Math.atan2(vy, vx);
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, shared.current.heading, Math.min(1, dt * 4));
    body.current.rotation.z = THREE.MathUtils.lerp(body.current.rotation.z, -Math.min(0.3, speed * 0.35), Math.min(1, dt * 4));
    const air = drone.alt > 0.08;
    for (const r of rotors) r.rotation.y += dt * (air ? 70 : 3);
    body.current.position.y = air ? Math.sin(state.clock.elapsedTime * 3) * 0.004 : 0;
    shared.current.pos.copy(g.current.position);
    if (shadow.current) {
      shadow.current.position.set(0, -g.current.position.y + 0.006, 0);
      const s = 1 / (1 + g.current.position.y * 0.6);
      shadow.current.scale.set(s, s, s);
    }
  });

  const tone = TONE[drone.status];
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
function CameraRig({ shared, follow }: { shared: Shared; follow: boolean }) {
  const look = useRef(new THREE.Vector3(1.9, 0, -1.8));
  useFrame((state, dt) => {
    if (!follow) return;
    const p = shared.current.pos;
    const h = shared.current.heading;
    const back = new THREE.Vector3(-Math.cos(h), 0, Math.sin(h));
    const side = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
    const desired = p.clone().addScaledVector(back, 1.25).addScaledVector(side, 0.45).add(new THREE.Vector3(0, 0.62, 0));
    desired.y = Math.max(desired.y, 0.35);
    state.camera.position.lerp(desired, Math.min(1, dt * 1.6));
    look.current.lerp(p.clone().addScaledVector(back, -0.35), Math.min(1, dt * 3));
    state.camera.lookAt(look.current);
  });
  return null;
}

export default function Scene3D({ permit, drone, trail, people, props, fx = {}, follow = true, compact }: SceneProps) {
  const shared = useRef({ pos: new THREE.Vector3(...v(drone.pos[0], drone.pos[1], drone.alt)), heading: 0 });
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [1.9, 7.5, 5.5], fov: compact ? 38 : 42, near: 0.02, far: 80 }} gl={{ antialias: true }}>
      <Sky sunPosition={[6, 4, 2]} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} />
      <fog attach="fog" args={["#dfe7ec", 10, 30]} />
      <hemisphereLight args={["#f1f5f9", "#8a7f6c", 0.75]} />
      <directionalLight position={[6, 9, 4]} intensity={2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
      <Suspense fallback={null}>
        <City permit={permit} />
        <Airport permit={permit} />
        <Zones permit={permit} />
        {props.map((p, i) => (p.kind === "crane" ? <Crane key={i} tower={p.tower!} boomEndX={p.boomEndX!} boomZ={p.boomZ!} /> : <Sign key={i} xy={p.xy!} text={p.text ?? ""} />))}
        {people.map((p, i) => (
          <Walker key={`${p.xy[0]}-${p.xy[1]}-${i}`} xy={p.xy} i={i} shirt={p.role === "crowd" ? SHIRTS[i % SHIRTS.length] : "#b91c1c"} />
        ))}
        <Trail trail={trail} permit={permit} />
        {fx.dropped && <Package pos={fx.dropped.pos} k={fx.dropped.k} />}
        <Drone drone={drone} fx={fx} shared={shared} />
        {fx.gust && <Gust shared={shared} />}
        {fx.beamTo && <Beam to={fx.beamTo} shared={shared} />}
      </Suspense>
      <CameraRig shared={shared} follow={follow} />
      {!follow && <OrbitControls target={[1.9, 0.2, -1.8]} maxPolarAngle={Math.PI / 2.15} minDistance={1} maxDistance={14} enableDamping />}
    </Canvas>
  );
}
