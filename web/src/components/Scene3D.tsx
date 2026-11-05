"use client";
// The 3D world: rebuilt from the signed permit and the recorded scene, with the real drone model.
// Sim coordinates are metres on a 1:50 city block (x east, y north, alt up) -> three.js (x, alt, -y).
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Edges, Grid, Line, OrbitControls, Text as DreiText, useGLTF } from "@react-three/drei";
import type { ComponentProps } from "react";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Permit, Person, Prop, XY } from "@/lib/flight";

const v = (x: number, y: number, alt = 0): [number, number, number] => [x, alt, -y];

// 3D labels use a bundled font: the default would be fetched from a CDN, which stalls on venue Wi-Fi.
const FONT = "/fonts/NotoSans-Regular.ttf";
const Text = (p: ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...p} />;

export interface DroneView {
  pos: XY;
  alt: number;
  vel: [number, number, number];
  status: "ok" | "deny" | "warn" | "breach" | "info";
}

export interface SceneProps {
  permit: Permit;
  drone: DroneView;
  trail: { pos: XY; alt: number }[];
  people: Person[];
  props: Prop[];
  markers?: { pos: XY; alt: number; color: string }[];
  follow?: boolean;
  compact?: boolean;
}

const STATUS_COLOR: Record<DroneView["status"], string> = {
  ok: "#34d399",
  info: "#38bdf8",
  deny: "#f43f5e",
  warn: "#fbbf24",
  breach: "#f43f5e",
};

function inPoly([x, y]: XY, poly: XY[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bounds(poly: XY[]) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// ---- the world ----------------------------------------------------------------------------
function Ground({ permit }: { permit: Permit }) {
  const g = bounds(permit.geofence);
  const ring = [...permit.geofence, permit.geofence[0]].map(([x, y]) => v(x, y, 0.01));
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[1.9, -0.002, -1.9]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0c1424" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={v((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, 0)} receiveShadow>
        <planeGeometry args={[g.x1 - g.x0, g.y1 - g.y0]} />
        <meshStandardMaterial color="#13261f" roughness={0.95} />
      </mesh>
      <Grid position={[1.9, 0.004, -1.9]} args={[30, 30]} cellSize={0.25} cellThickness={0.5} cellColor="#1e3a5f" sectionSize={1} sectionThickness={1} sectionColor="#2563eb" fadeDistance={22} fadeStrength={1.5} infiniteGrid={false} />
      <Line points={ring} color="#22d3ee" lineWidth={2.5} />
      {/* translucent permit wall */}
      {permit.geofence.map(([x, y], i) => {
        const [nx, ny] = permit.geofence[(i + 1) % permit.geofence.length];
        const len = Math.hypot(nx - x, ny - y);
        return (
          <mesh key={i} position={v((x + nx) / 2, (y + ny) / 2, permit.altCeilingM / 2)} rotation-y={Math.atan2(ny - y, nx - x)}>
            <planeGeometry args={[len, permit.altCeilingM]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        );
      })}
      <Text position={v(g.x0 + 0.1, g.y0 - 0.15, 0.02)} rotation-x={-Math.PI / 2} fontSize={0.13} color="#67e8f9" anchorX="left">
        {`PERMITTED AREA · CEILING ${permit.altCeilingM} m`}
      </Text>
    </group>
  );
}

function NoFly({ permit }: { permit: Permit }) {
  return (
    <>
      {permit.noFly.map((z) => {
        const b = bounds(z.polygon);
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        const w = b.x1 - b.x0;
        const d = b.y1 - b.y0;
        const h = permit.altCeilingM + 0.3;
        return (
          <group key={z.name}>
            <mesh rotation-x={-Math.PI / 2} position={v(cx, cy, 0.006)}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#2a1418" />
            </mesh>
            {/* runway */}
            <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 4} position={v(cx, cy, 0.009)}>
              <planeGeometry args={[w * 1.25, 0.22]} />
              <meshStandardMaterial color="#1b1f27" />
            </mesh>
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={i} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 4} position={v(cx + (i - 3) * 0.17 * Math.SQRT1_2, cy + (i - 3) * 0.17 * Math.SQRT1_2, 0.011)}>
                <planeGeometry args={[0.08, 0.018]} />
                <meshBasicMaterial color="#e5e7eb" />
              </mesh>
            ))}
            <mesh position={v(cx, cy, h / 2)}>
              <boxGeometry args={[w, h, d]} />
              <meshBasicMaterial color="#f43f5e" transparent opacity={0.07} depthWrite={false} />
              <Edges color="#f43f5e" threshold={15} />
            </mesh>
            {/* control tower */}
            <mesh position={v(cx + w * 0.32, cy + d * 0.32, 0.3)} castShadow>
              <cylinderGeometry args={[0.05, 0.07, 0.6, 12]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={v(cx + w * 0.32, cy + d * 0.32, 0.64)} castShadow>
              <cylinderGeometry args={[0.11, 0.08, 0.1, 12]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.6} />
            </mesh>
            <Text position={v(cx, cy, h + 0.12)} fontSize={0.14} color="#fb7185" anchorX="center" outlineWidth={0.006} outlineColor="#000">
              {`NO-FLY · ${z.name}`}
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
              <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.25} />
            </mesh>
            {Object.keys(spots).length > 1 &&
              Object.entries(spots).map(([k, [sx, sy]]) => (
                <group key={k}>
                  <mesh rotation-x={-Math.PI / 2} position={v(sx, sy, 0.012)}>
                    <planeGeometry args={[0.16, 0.16]} />
                    <meshStandardMaterial color="#fafafa" />
                  </mesh>
                  <Text rotation-x={-Math.PI / 2} position={v(sx, sy, 0.015)} fontSize={0.12} color="#111827" anchorX="center" anchorY="middle">
                    {k}
                  </Text>
                </group>
              ))}
            <Text position={v(x, y - 0.38, 0.02)} rotation-x={-Math.PI / 2} fontSize={0.11} color="#fde68a" anchorX="center">
              {`DROP ZONE ${name}`}
            </Text>
          </group>
        );
      })}
      {Object.entries(permit.rallyPoints).map(([name, [x, y]]) => (
        <group key={name}>
          <mesh rotation-x={-Math.PI / 2} position={v(x, y, 0.008)}>
            <circleGeometry args={[0.16, 32]} />
            <meshStandardMaterial color="#1d4ed8" emissive="#2563eb" emissiveIntensity={0.35} />
          </mesh>
          <Text rotation-x={-Math.PI / 2} position={v(x, y, 0.012)} fontSize={0.14} color="#e0f2fe" anchorX="center" anchorY="middle">
            H
          </Text>
          <Text rotation-x={-Math.PI / 2} position={v(x, y - 0.24, 0.012)} fontSize={0.08} color="#93c5fd" anchorX="center">
            {name}
          </Text>
        </group>
      ))}
    </>
  );
}

function Buildings() {
  const list: [number, number, number, string][] = [
    [0.9, 3.6, 0.35, "#334155"],
    [4.2, 0.9, 0.45, "#3f3f46"],
    [-0.2, 2.0, 0.25, "#374151"],
  ];
  return (
    <>
      {list.map(([x, y, h, c], i) => (
        <group key={i}>
          <mesh position={v(x, y, h)} castShadow receiveShadow>
            <boxGeometry args={[0.4, h * 2, 0.4]} />
            <meshStandardMaterial color={c} roughness={0.7} />
            <Edges color="#64748b" />
          </mesh>
          {Array.from({ length: Math.floor(h * 8) }).map((_, k) => (
            <mesh key={k} position={v(x, y - 0.201, 0.12 + k * 0.1)}>
              <planeGeometry args={[0.3, 0.035]} />
              <meshBasicMaterial color={k % 3 === 0 ? "#fde68a" : "#1e293b"} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function Crane({ tower, boomEndX, boomZ }: { tower: XY; boomEndX: number; boomZ: number }) {
  const [tx, ty] = tower;
  const len = boomEndX - tx;
  return (
    <group>
      <mesh position={v(tx, ty, (boomZ + 0.3) / 2)} castShadow>
        <boxGeometry args={[0.1, boomZ + 0.3, 0.1]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.5} />
        <Edges color="#78350f" />
      </mesh>
      <mesh position={v(tx + len / 2, ty, boomZ)} castShadow>
        <boxGeometry args={[len, 0.4, 0.1]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.3} roughness={0.5} transparent opacity={0.28} depthWrite={false} />
        <Edges color="#f59e0b" />
      </mesh>
      {Array.from({ length: Math.max(2, Math.round(len / 0.2)) }).map((_, i, arr) => {
        const x0 = tx + (len * i) / arr.length;
        const x1 = tx + (len * (i + 1)) / arr.length;
        return <Line key={i} points={[v(x0, ty, boomZ - 0.2), v(x1, ty, boomZ + 0.2)]} color="#f59e0b" lineWidth={1.5} />;
      })}
      <mesh position={v(tx - 0.25, ty, boomZ + 0.1)}>
        <boxGeometry args={[0.5, 0.12, 0.09]} />
        <meshStandardMaterial color="#d97706" />
      </mesh>
      <Line points={[v(tx + len * 0.75, ty, boomZ - 0.2), v(tx + len * 0.75, ty, 0.25)]} color="#a3a3a3" lineWidth={1} />
      <Text position={v(tx + len / 2, ty, boomZ + 0.35)} fontSize={0.1} color="#fcd34d" anchorX="center" outlineWidth={0.005} outlineColor="#000">
        CRANE (raised after route planning)
      </Text>
    </group>
  );
}

function Sign({ xy, text }: { xy: XY; text: string }) {
  return (
    <group position={v(xy[0], xy[1], 0)}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <boxGeometry args={[0.36, 0.22, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text position={[0, 0.27, 0.007]} fontSize={0.04} color="#dc2626" anchorX="center" anchorY="middle" maxWidth={0.32} textAlign="center" lineHeight={1.15}>
        {text.split(" / ").join("\n")}
      </Text>
    </group>
  );
}

const SHIRTS = ["#ef4444", "#3b82f6", "#a855f7", "#10b981", "#f97316", "#ec4899"];
function People({ people }: { people: Person[] }) {
  return (
    <>
      {people.map((p, i) => {
        const shirt = p.role === "customer" || p.role === "pedestrian" ? "#ef4444" : SHIRTS[i % SHIRTS.length];
        return (
          <group key={`${p.xy[0]}-${p.xy[1]}-${i}`} position={v(p.xy[0], p.xy[1], 0)}>
            <mesh position={[0, 0.1, 0]} castShadow>
              <capsuleGeometry args={[0.035, 0.12, 4, 10]} />
              <meshStandardMaterial color="#1e3a8a" />
            </mesh>
            <mesh position={[0, 0.22, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.1, 4, 10]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
            <mesh position={[0, 0.34, 0]} castShadow>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshStandardMaterial color="#e0b088" />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
              <ringGeometry args={[0.09, 0.11, 32]} />
              <meshBasicMaterial color={shirt} transparent opacity={0.5} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ---- the drone ---------------------------------------------------------------------------
function DroneModel({ drone, follow }: { drone: DroneView; follow?: boolean }) {
  const { scene } = useGLTF("/models/drone.glb");
  // Measure the real model and fit it to a fixed span, whatever scale the file was authored in.
  const { model, fit } = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = 0.5 / Math.max(size.x, size.z, 1e-6);
    m.position.set(-center.x, -center.y, -center.z);
    return { model: m, fit: k };
  }, [scene]);
  const rotors = useMemo(() => ["Rotor_FL", "Rotor_FR", "Rotor_BL", "Rotor_BR"].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[], [model]);
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const stem = useRef<THREE.Mesh>(null);
  const heading = useRef(0);
  const target = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    target.current.set(...v(drone.pos[0], drone.pos[1], drone.alt));
    g.position.lerp(target.current, Math.min(1, dt * 12));
    const [vx, vy] = drone.vel;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.05) heading.current = Math.atan2(vy, vx);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, heading.current, Math.min(1, dt * 4));
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -Math.min(0.35, speed * 0.4), Math.min(1, dt * 4));
    const airborne = drone.alt > 0.08;
    for (const r of rotors) r.rotation.y += dt * (airborne ? 60 : 4);
    // ground ring + altitude stem stay under the drone, whatever its tilt
    const h = Math.max(0.01, g.position.y);
    if (ring.current) {
      ring.current.position.set(0, -h + 0.012, 0);
      ring.current.rotation.set(-Math.PI / 2 - g.rotation.x, 0, 0);
    }
    if (stem.current) {
      stem.current.position.set(0, -h / 2, 0);
      stem.current.scale.set(1, h, 1);
    }
    g.position.y += airborne ? Math.sin(state.clock.elapsedTime * 3) * 0.002 : 0;
    if (follow) {
      state.camera.position.lerp(new THREE.Vector3(g.position.x - 0.85, g.position.y + 0.55, g.position.z + 0.95), Math.min(1, dt * 2));
      state.camera.lookAt(g.position);
    }
  });

  const color = STATUS_COLOR[drone.status];
  return (
    <group ref={group}>
      <group scale={fit}>
        <primitive object={model} />
      </group>
      <pointLight color={color} intensity={1.6} distance={1.2} position={[0, -0.05, 0]} />
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.13, 0.17, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh ref={stem}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
useGLTF.preload("/models/drone.glb");

function Trail({ trail, permit }: { trail: { pos: XY; alt: number }[]; permit: Permit }) {
  if (trail.length < 2) return null;
  const pts = trail.map((s) => v(s.pos[0], s.pos[1], s.alt));
  const colors = trail.map((s) => {
    const bad = permit.noFly.some((z) => inPoly(s.pos, z.polygon)) || !inPoly(s.pos, permit.geofence) || s.alt > permit.altCeilingM;
    return new THREE.Color(bad ? "#f43f5e" : "#22d3ee");
  });
  const shadow = trail.map((s) => v(s.pos[0], s.pos[1], 0.013));
  return (
    <>
      <Line points={pts} vertexColors={colors} lineWidth={3} />
      <Line points={shadow} color="#0ea5e9" lineWidth={1} transparent opacity={0.35} dashed dashSize={0.05} gapSize={0.04} />
    </>
  );
}

function Markers({ markers }: { markers: { pos: XY; alt: number; color: string }[] }) {
  return (
    <>
      {markers.map((m, i) => (
        <group key={i} position={v(m.pos[0], m.pos[1], 0)}>
          <mesh position={[0, m.alt / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, m.alt, 6]} />
            <meshBasicMaterial color={m.color} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, m.alt, 0]}>
            <octahedronGeometry args={[0.035]} />
            <meshBasicMaterial color={m.color} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function Scene3D({ permit, drone, trail, people, props, markers = [], follow, compact }: SceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [1.9, 6.2, 3.6], fov: compact ? 40 : 42 }} gl={{ antialias: true }}>
      <color attach="background" args={["#060a14"]} />
      <fog attach="fog" args={["#060a14", 9, 22]} />
      <hemisphereLight args={["#a5b4fc", "#0b1220", 0.55]} />
      <directionalLight position={[4, 8, 3]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <ambientLight intensity={0.25} />
      <Suspense fallback={null}>
        <Ground permit={permit} />
        <NoFly permit={permit} />
        <Zones permit={permit} />
        <Buildings />
        {props.map((p, i) =>
          p.kind === "crane" ? <Crane key={i} tower={p.tower!} boomEndX={p.boomEndX!} boomZ={p.boomZ!} /> : <Sign key={i} xy={p.xy!} text={p.text ?? ""} />,
        )}
        <People people={people} />
        <Trail trail={trail} permit={permit} />
        <Markers markers={markers} />
        <DroneModel drone={drone} follow={follow} />
        <ContactShadows position={[1.9, 0.001, -1.9]} scale={12} blur={2.2} opacity={0.45} far={2} />
      </Suspense>
      {!follow && <OrbitControls target={[1.9, 0.2, -1.8]} maxPolarAngle={Math.PI / 2.1} minDistance={1.5} maxDistance={12} enableDamping />}
    </Canvas>
  );
}
