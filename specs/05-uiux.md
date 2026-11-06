# specs/05-uiux.md: "Two Truths" UI/UX + 3D Spec (Claude Code handoff)

> If specs/05-uiux.md already has content, this file is an ADDENDUM named 05b-uiux-3d.md. Never overwrite existing specs.
> Project: independent, tamper-evident black box for autonomous drones. 0G decides and records, Chainlink judges, Arc pays.
> Anything marked [ASSUMPTION] must be confirmed against specs/02-TRD.md and specs/04-backend-core.md before it is presented as fact in the UI.
>
> **Repo note (2026-11-06):** specs/00-04 and 06-08 do not exist in this repo. Decisions taken with the owner are in
> `specs/05a-uiux-decisions.md`; that file records where this spec is adapted to the real code and takes precedence over it.

---

## 0. Non-interference contract (read first, obey always)

This file ADDS a UI layer. It must not disturb the workflow already in the repo.

1. Precedence: CLAUDE.md and specs 00-04 and 06-08 win over this file in any conflict. On conflict, STOP and ask.
2. Scope: create or modify files only under `web/` (UI), plus: this spec file, append-only edits to `AI_USAGE.md` and `CREDITS.md`, and files in `prompts/`.
3. Never touch: `contracts/`, deploy scripts, `.env*`, existing specs (except adding this file), existing CI config.
4. CLAUDE.md: append a "## UI / 3D rules" section (Section 12) only if absent. Never edit or reorder existing lines.
5. Branch: work on `feat/ui-3d`. Small commits, one task per commit, messages like `ui(UI-4): flight rig + banking`.
6. If `web/` already exists: detect its framework, package manager (lockfile) and routes. Add alongside. Do NOT upgrade React/Next/Tailwind majors. If the `/` route is taken, build at `/experience` and ask before replacing anything. On a peer-dependency conflict, STOP and ask.
7. Data comes ONLY through `web/lib/data/adapter.ts`. Do not add backend endpoints or change contract ABIs. If a field is missing from the backend, use replay data and mark [ASSUMPTION].
8. Baseline: before any change, run the existing checks (`forge test`, and `npm run build` in web/ if it exists). Report results. Do not "fix" unrelated failures.
9. ETHGlobal compliance: commit history must be incremental, every AI-assisted file is logged in AI_USAGE.md, specs and prompts are committed, third-party assets are listed in CREDITS.md.
10. Never ask for or print private keys. Secrets live in `.env.local` only (gitignored). Testnets only.

---

## 1. Kickoff prompt

Saved verbatim in `prompts/00-kickoff.md`.

---

## 2. Product and experience

**One line:** a black box for autonomous drones that nobody, including the operator, can quietly rewrite.

**How it works (what the UI tells) [ASSUMPTION: confirm against specs/02-TRD.md]:**
1. The drone emits telemetry samples (~10 Hz).
2. Decisions are made and recorded via 0G. Samples are grouped into blocks and hash-chained.
3. Chainlink judges the record and returns a verdict (pass/fail).
4. Arc pays out only on a pass.
5. Anyone can recompute the chain client-side and compare it to the anchored hashes.

**Core concept, "Two Truths":** every flight has a *claimed* timeline (what someone says happened) and a *recorded* timeline (sealed hash chain). If they match, the trails overlap and glow cyan. If someone edits one value, every later block breaks, the claimed trail physically diverges from the recorded trail, the Chainlink gate flips to FAIL, and the Arc payment is blocked. The visitor can do the tampering themselves.

**Honesty rule:** the playground is labeled "local simulation". Live panels are labeled "recorded on 0G / judged by Chainlink / settled on Arc" and show real data with explorer links, or replay data labeled "replay". A mode badge (live / replay / sandbox) is always visible.

---

## 3. Stack, install, tooling

```bash
cd web   # create the app only if it does not exist: npx create-next-app@latest web --ts --tailwind --app
# use the repo's package manager (check lockfile); npm shown
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing gsap lenis zustand motion viem
npm i -D @types/three leva r3f-perf vitest jsdom @playwright/test
npx playwright install chromium
# only if using a downloaded drone model:
npm i -D @gltf-transform/cli
```
Check versions with Context7: R3F v9 pairs with React 19, R3F v8 with React 18. Do not bump React or Next to fit.

**Claude Code tooling:**
```bash
claude mcp add playwright -- npx @playwright/mcp@latest      # visual feedback loop
claude mcp add context7 -- npx -y @upstash/context7-mcp      # current library docs
```
Run `/plugin` and look for the frontend-design plugin or skill in the marketplace, and enable it if available. Canva connector: 2D only (logo, favicon, OG image). GitHub connector: keep commit history visible.

**Drone asset options** (record the choice in CREDITS.md):
- A) Procedural drone built from primitives (default, original, tiny, no license risk).
- B) Downloaded GLB (Sketchfab, check license; CC-BY needs attribution). Pipeline:
```bash
npx gltf-transform optimize drone.glb drone-opt.glb --compress draco --texture-compress webp
npx gltfjsx drone-opt.glb --transform --types
```
Targets: under 2 MB, under 50k triangles, rotors as separate nodes. HDRI: Poly Haven (CC0), under 1 MB (1k or 2k).

---

## 4. Architecture and folders

```
web/
├── app/ (layout.tsx, page.tsx or experience/page.tsx, globals.css)
├── components/
│   ├── canvas/ Scene.tsx FlightRig.tsx Drone.tsx BlackBox.tsx Trails.tsx HashChain.tsx Effects.tsx
│   │   └── stations/ ZeroGRing.tsx ChainlinkGate.tsx ArcPulse.tsx
│   ├── sections/ Hero Problem TwoTruths ZeroG Chainlink Arc LiveVerify Footer
│   └── ui/ Nav ModeBadge HashChip TxLink StatCard TamperPanel VerdictPill Loader
├── lib/
│   ├── store.ts  math.ts  geo.ts  flight-curve.ts  camera-keys.ts  quality.ts
│   └── data/ types.ts hash.ts adapter.ts replay.ts live.ts
├── public/ data/sample-flight.json  models/  hdri/
├── scripts/gen-sample-flight.ts
└── tests/ (vitest unit) + e2e/ (playwright)
```

**Layering:** `lib/data` (pure logic, no React) -> zustand store -> canvas and DOM both read the store. The 3D scene and the DOM never talk to each other directly.

**Env vars (`.env.local`, names only):** `NEXT_PUBLIC_DATA_MODE=replay|live`, `NEXT_PUBLIC_ZEROG_EXPLORER`, `NEXT_PUBLIC_CHAINLINK_EXPLORER`, `NEXT_PUBLIC_ARC_EXPLORER`. Backend URLs per specs/04.

---

## 5. Data contracts and hash chain

```ts
// lib/data/types.ts
export type Hex = `0x${string}`;
export interface Sample {           // integers only, so hashing is deterministic
  tMs: number;                      // unix ms
  latE7: number; lonE7: number;     // degrees * 1e7
  altMm: number;                    // millimetres
  vNmmS: number; vEmmS: number; vDmmS: number;  // NED velocity, mm/s
  headingCdeg: number;              // 0..35999
}
export type Verdict = "idle" | "pending" | "pass" | "fail";
export interface FlightRecord {
  id: string;
  blocks: Sample[][];               // samples grouped into blocks (e.g. 10 samples each)
  anchoredHashes: Hex[];            // chain as anchored on 0G [ASSUMPTION: field mapping per specs/04]
  zeroG?: { recordId: string; url?: string };
  chainlink?: { status: Verdict; requestId?: string; url?: string };
  arc?: { status: "none" | "pending" | "paid" | "blocked"; txHash?: Hex; url?: string };
}
export interface FlightSource {
  load(id: string): Promise<FlightRecord>;
}
```

```ts
// lib/data/hash.ts
// SCHEME (reference for the simulation): leaf_i = keccak256(packed samples of block i)
//                                         h_i    = keccak256(h_{i-1} || leaf_i), h_-1 = 0x00..00
// [ASSUMPTION] The UI may only say "matches the 0G record" if this encoding equals the backend's (specs/04). Adapt to match.
import { keccak256, encodePacked, concatHex } from "viem";
import type { Hex, Sample } from "./types";

export const ZERO: Hex = `0x${"00".repeat(32)}`;
const TYPES = ["uint64","int32","int32","int32","int32","int32","int32","uint16"] as const;

export const encodeSample = (s: Sample): Hex =>
  encodePacked([...TYPES] as any,
    [BigInt(s.tMs), s.latE7, s.lonE7, s.altMm, s.vNmmS, s.vEmmS, s.vDmmS, s.headingCdeg] as any);

export const leaf = (b: Sample[]): Hex => keccak256(concatHex(b.map(encodeSample)));
export const link = (prev: Hex, l: Hex): Hex => keccak256(encodePacked(["bytes32","bytes32"], [prev, l]));

export function buildChain(blocks: Sample[][]): Hex[] {
  const out: Hex[] = []; let prev = ZERO;
  for (const b of blocks) { prev = link(prev, leaf(b)); out.push(prev); }
  return out;
}
export function firstMismatch(a: Hex[], b: Hex[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return -1;
}
export function verify(blocks: Sample[][], anchored: Hex[]) {
  const i = firstMismatch(buildChain(blocks), anchored);
  return { ok: i === -1, firstBad: i };
}
export function tamper(blocks: Sample[][], bi: number, si: number, patch: Partial<Sample>): Sample[][] {
  return blocks.map((b, i) => (i !== bi ? b : b.map((s, j) => (j === si ? { ...s, ...patch } : s))));
}
// float -> integer quantization (do this ONCE at ingestion, never inside hashing)
export const q = {
  deg: (d: number) => Math.round(d * 1e7),
  mm: (m: number) => Math.round(m * 1000),
  hdg: (deg: number) => Math.round((((deg % 360) + 360) % 360) * 100) % 36000,
};
```
Why this works: changing one sample changes its leaf, so h_t changes, so every h_i for i >= t changes. This is the avalanche the UI visualizes.

```ts
// lib/data/adapter.ts
import type { FlightSource } from "./types";
import { replaySource } from "./replay";
import { liveSource } from "./live";
export const source: FlightSource =
  process.env.NEXT_PUBLIC_DATA_MODE === "live" ? liveSource : replaySource;
// replay.ts: fetch("/data/sample-flight.json") and build anchoredHashes with buildChain (label "replay")
// live.ts: map the real backend responses (specs/04) to FlightRecord; on failure fall back to replay and set mode badge
```

**Sample flight generator (`scripts/gen-sample-flight.ts`):** 90 s at 10 Hz = 900 samples, block size 10 = 90 blocks (keep blocks <= 600 for per-frame color updates).
- Position: `E(t)=A·sin(0.07t)`, `N(t)=B·sin(0.035t)·cos(0.02t)`, `alt(t)=30+18·sin(0.09t)` (metres), converted back to lat/lon around an arbitrary origin.
- Velocity from finite differences of E, N, alt (NED: vD = -d alt/dt). Heading = atan2(vE, vN).
- Quantize with `q`, group into blocks, write JSON.

---

## 6. Math and physics reference (implement exactly, then tune visually)

**6.1 GPS to scene coordinates (equirectangular, fine under a few km):**
```
east  = (lon - lon0)·(π/180)·R·cos(lat0·π/180)     R = 6378137 m
north = (lat - lat0)·(π/180)·R
scene = ( east, altitude, -north )                  // three is right-handed: x east, y up, z = east × up = -north
```
Then center and scale the telemetry path to fit a box of ~36 units (`s = size / max(extent)`). Optional altitude exaggeration ×1.5-2.5 BEFORE fitting, so altitude lies are visible.

**6.2 Paths:** use `CatmullRomCurve3(points, false, "centripetal")`. `getPointAt(u)` and `getTangentAt(u)` use ARC-LENGTH parameterization, so speed along the curve is uniform in u. Never use `getPoint` for motion.

**6.3 Scroll to progress:** `u_target = progress` from Lenis (0..1). Smooth it in the rig, not in the DOM.

**6.4 Frame-rate-independent damping:** `x ← x + (target − x)·(1 − e^(−λΔt))` (three: `MathUtils.damp(x, y, λ, dt)`). Half-life `t½ = ln2/λ`, so λ=4.5 gives about 0.15 s. Two steps of dt/2 equal one step of dt exactly (unit-test this). Clamp `dt ≤ 1/20` to survive tab-switch spikes.

**6.5 Critically damped spring (no overshoot):**
```ts
// lib/math.ts
export const clamp = (x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export const smoothstep = (a:number,b:number,x:number)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
export const easeOutCubic = (t:number)=>1-Math.pow(1-clamp(t,0,1),3);
export function smoothDamp(cur:number, target:number, vel:{v:number}, smoothTime:number, dt:number){
  const omega = 2/Math.max(1e-4, smoothTime), x = omega*dt;
  const e = 1/(1 + x + 0.48*x*x + 0.235*x*x*x);
  const change = cur - target, temp = (vel.v + omega*change)*dt;
  vel.v = (vel.v - omega*temp)*e;
  let out = target + (change + temp)*e;
  if ((target - cur > 0) === (out > target)) { out = target; vel.v = 0; }
  return out;
}
```

**6.6 Banking (coordinated turn):** `tan φ = v²/(g·r) = v²·κ/g`. Curvature from two tangents: `κ ≈ (t0 × t1).y / ds`, where `(t0 × t1).y = t0.z·t1.x − t0.x·t1.z` (left turn positive) and `ds` is the arc length between the samples. Use `φ = atan(BANK_GAIN·κ)` with `BANK_GAIN = V²/g` in scene units (start 4.5, tune with leva), clamp to ±28°, damp λ=5. If the drone leans OUTWARD, flip the sign (verify with a screenshot).

**6.7 Orientation:** model forward is **−Z**. `Matrix4.lookAt(zero, forward, up)` makes local −Z point along `forward`. Then `q = q_look · q_roll(Z, φ)`, applied with `slerp(q, 1 − e^(−8Δt))`.

**6.8 Hover bob:** `y = A·sin(2π f t + φ0)`, with A=0.03, f=0.4 Hz; add a tiny second harmonic (0.4·A at 2.3 f) so it doesn't look mechanical. Applied inside the Drone (local), not the rig.

**6.9 Rotors:** quad props alternate direction (CW, CCW, CCW, CW) to cancel yaw torque. Thrust `T ∝ ω²`, so hover needs `ω_hover = sqrt(m·g/(4·k_t))` and ω rises with climb. Visual model: `ω = ω0 + k_c·climb` (climb = tangent.y), ω0 = 2π·14 rad/s. At 60 fps, Δθ = ω·dt ≈ 84° per frame, so the blades alias (wagon-wheel). Fix: crossfade blade meshes to a translucent blur disc with `discOpacity = smoothstep(30, 70, ω)`; show blades only during spin-up in the hero intro.

**6.10 Trails:** `TubeGeometry` gives `uv.x = i/tubularSegments` (fraction along the path), so reveal with `if (uv.x > uReveal) discard;`. Static geometry, animated uniforms, zero per-frame allocation.

**6.11 Divergence:** claimed path `C(s) = R(s) + D(s)`, `D(s) = δ · uDiverge · smoothstep(s_t, s_t + w, s) · b(s)`.
- `s_t = t/N` (fraction where the tampered block sits), `w ≈ 0.12`.
- `b(s)` is the Frenet binormal at s (`curve.computeFrenetFrames`), supplied as vertex attribute `aDir`.
- `δ = clamp(|Δvalue|/range, 0.15, 1)·2.5` scene units.
- Done in the vertex shader, so animating `uDiverge` 0→1 costs nothing on the CPU.

**6.12 Hash cascade timing:** tampered block t, N blocks, cascade duration T_c = 1.2 s. For block i ≥ t: `τ_i = (i−t)/(N−1−t)·T_c`, `k_i = easeOutCubic((now−τ_i)/0.25)`, `color_i = lerp(cyan, red, k_i)`. Verdict flips at `T_c + 0.25 + 0.2` s. Total feedback under ~1.7 s.

**6.13 Fresnel (capsule rim):** Schlick `F = F0 + (1−F0)(1−cosθ)^5`; stylized `pow(1−cosθ, 2.5)` looks better here.

**6.14 Bloom (selective, no extra pass):** emissive colors with value > 1, materials `toneMapped={false}`, `Bloom luminanceThreshold={1}`. Only HDR-bright pixels bloom. For instanced colors multiply by ~2.2.

**6.15 Camera follow:** yaw-only forward `f = normalize(t.x, 0, t.z)`, `right = f × up`. Desired = `p − f·dist + right·lat + (0,h,0)`, each axis damped (λ=3). Look at `p + f·lookAhead`. FOV breathing: `fov = base + k·speedNorm`, damped. Camera keyframes interpolated with smoothstep (Section 8).

**6.16 Particle stream (cheap, no GPGPU):** N instanced particles on a quadratic Bézier B(s). `s_i = fract(i/N + speed·time)`; swirl offset `r(s)·(n·cosθ + b·sinθ)`, `θ = φ_i + ω·s`, `r(s) = r0·(1 − s)`. Optional upgrade: curl-noise field `v = ∇ × ψ` with ψ = three noise potentials, in a ping-pong `GPUComputationRenderer`. Skip unless everything else is done.

**6.17 Budgets:** 60 fps on a mid laptop; draw calls < 120; triangles < 300k; `dpr = clamp(devicePixelRatio, 1, 1.75)`; GLB < 2 MB; initial JS for the 3D chunk < 350 kB gzip (lazy-loaded).

---

## 7. Core code

### 7.1 Store
```ts
// lib/store.ts
import { create } from "zustand";
import type { Verdict } from "./data/types";
export type Mode = "live" | "replay" | "sandbox";
export type Quality = "high" | "medium" | "low";
interface UI {
  scroll: number; mode: Mode; verdict: Verdict; quality: Quality;
  tamperIndex: number | null; tamperDelta: number; tamperClock: number | null;  // clock = start time (s) of cascade
  setScroll: (v:number)=>void; setMode:(m:Mode)=>void; setVerdict:(v:Verdict)=>void; setQuality:(q:Quality)=>void;
  startTamper:(i:number, delta:number)=>void; resetTamper:()=>void;
}
export const useUI = create<UI>((set)=>({
  scroll:0, mode:"replay", verdict:"idle", quality:"high",
  tamperIndex:null, tamperDelta:0, tamperClock:null,
  setScroll:(scroll)=>set({scroll}), setMode:(mode)=>set({mode}), setVerdict:(verdict)=>set({verdict}), setQuality:(quality)=>set({quality}),
  startTamper:(tamperIndex, tamperDelta)=>set({tamperIndex, tamperDelta, tamperClock: performance.now()/1000}),
  resetTamper:()=>set({tamperIndex:null, tamperDelta:0, tamperClock:null, verdict:"idle"}),
}));
```
In `useFrame`, read with `useUI.getState()` (no re-renders). Use selectors in DOM components.

### 7.2 Smooth scroll provider (disabled for reduced motion)
```tsx
// components/ScrollProvider.tsx ("use client")
import Lenis from "lenis"; import gsap from "gsap"; import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react"; import { useUI } from "@/lib/store";
export function ScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const on = () => useUI.getState().setScroll(scrollY / Math.max(1, document.body.scrollHeight - innerHeight));
      addEventListener("scroll", on, { passive: true }); on(); return () => removeEventListener("scroll", on);
    }
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", (l: any) => { ScrollTrigger.update(); useUI.getState().setScroll(l.progress); });
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);
  return <>{children}</>;
}
```

### 7.3 Story curve and camera keys
```ts
// lib/flight-curve.ts
import * as THREE from "three";
export const storyPoints = [
  [0,0,0],[3,1,-14],[-2,2.5,-30],[-6,4,-52],[0,3,-76],[6,2,-98],[2,1.5,-120],[0,1,-136],
].map(([x,y,z]) => new THREE.Vector3(x,y,z));
export const storyCurve = new THREE.CatmullRomCurve3(storyPoints, false, "centripetal");
```
```ts
// lib/camera-keys.ts
import { smoothstep } from "./math";
export const KEYS = [
  { u:0.00, dist:3.4, h:0.8, lat: 0.0, look:8, fov:42 },
  { u:0.12, dist:4.0, h:1.2, lat:-1.2, look:6, fov:46 },
  { u:0.26, dist:9.0, h:4.0, lat: 0.0, look:10, fov:50 },
  { u:0.50, dist:4.5, h:1.0, lat: 1.5, look:6, fov:44 },
  { u:0.64, dist:4.5, h:0.8, lat:-1.5, look:6, fov:44 },
  { u:0.78, dist:4.5, h:1.0, lat: 1.5, look:6, fov:44 },
  { u:0.90, dist:2.2, h:0.4, lat: 0.0, look:3, fov:38 },
  { u:1.00, dist:1.2, h:0.2, lat: 0.0, look:2, fov:34 },
];
export const camOut = { dist:0, h:0, lat:0, look:0, fov:0 };
export function sampleCam(u:number){
  let i = 0; while (i < KEYS.length-2 && u >= KEYS[i+1].u) i++;
  const a = KEYS[i], b = KEYS[i+1], t = smoothstep(a.u, b.u, u);
  camOut.dist = a.dist+(b.dist-a.dist)*t; camOut.h = a.h+(b.h-a.h)*t; camOut.lat = a.lat+(b.lat-a.lat)*t;
  camOut.look = a.look+(b.look-a.look)*t; camOut.fov = a.fov+(b.fov-a.fov)*t; return camOut;
}
```

### 7.4 Flight rig (drone pose + banking + camera)
```tsx
// components/canvas/FlightRig.tsx ("use client")
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three"; import { useMemo, useRef } from "react";
import { useUI } from "@/lib/store"; import { storyCurve } from "@/lib/flight-curve"; import { sampleCam } from "@/lib/camera-keys";
const UP = new THREE.Vector3(0,1,0), Z = new THREE.Vector3(0,0,1);
const BANK_GAIN = 4.5, MAX_ROLL = THREE.MathUtils.degToRad(28), LEN = storyCurve.getLength();
export function FlightRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null!); const { camera } = useThree();
  const s = useMemo(() => ({ u:0, roll:0, p:new THREE.Vector3(), t0:new THREE.Vector3(), t1:new THREE.Vector3(),
    f:new THREE.Vector3(), yaw:new THREE.Vector3(), right:new THREE.Vector3(), desired:new THREE.Vector3(), look:new THREE.Vector3(),
    m:new THREE.Matrix4(), q:new THREE.Quaternion(), qr:new THREE.Quaternion(), zero:new THREE.Vector3() }), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1/20), D = THREE.MathUtils.damp;
    s.u = D(s.u, useUI.getState().scroll, 4.5, dt);
    const u = THREE.MathUtils.clamp(s.u, 0, 1), e = 0.004, ua = Math.max(0,u-e), ub = Math.min(1,u+e);
    storyCurve.getPointAt(u, s.p); storyCurve.getTangentAt(ua, s.t0); storyCurve.getTangentAt(ub, s.t1);
    s.f.copy(s.t0).add(s.t1).normalize();
    const ds = LEN*(ub-ua) || 1, kappa = (s.t0.z*s.t1.x - s.t0.x*s.t1.z)/ds;
    const phi = Math.atan(BANK_GAIN*kappa);                       // tanφ = v²κ/g  (flip sign if leaning outward)
    s.roll = D(s.roll, THREE.MathUtils.clamp(-phi, -MAX_ROLL, MAX_ROLL), 5, dt);
    s.m.lookAt(s.zero, s.f, UP); s.q.setFromRotationMatrix(s.m);  // local -Z -> forward
    s.qr.setFromAxisAngle(Z, s.roll); s.q.multiply(s.qr);
    group.current.position.copy(s.p); group.current.quaternion.slerp(s.q, 1-Math.exp(-8*dt));
    // camera: yaw-only so it never rolls
    s.yaw.set(s.t0.x+s.t1.x, 0, s.t0.z+s.t1.z).normalize(); s.right.crossVectors(s.yaw, UP);
    const k = sampleCam(u);
    s.desired.copy(s.p).addScaledVector(s.yaw, -k.dist).addScaledVector(s.right, k.lat); s.desired.y += k.h;
    camera.position.set(D(camera.position.x, s.desired.x, 3, dt), D(camera.position.y, s.desired.y, 3, dt), D(camera.position.z, s.desired.z, 3, dt));
    s.look.copy(s.p).addScaledVector(s.yaw, k.look); camera.lookAt(s.look);
    const pc = camera as THREE.PerspectiveCamera;
    if (Math.abs(pc.fov-k.fov) > 0.01) { pc.fov = D(pc.fov, k.fov, 3, dt); pc.updateProjectionMatrix(); }
  });
  return <group ref={group}>{children}</group>;
}
```

### 7.5 Drone (procedural default)
Build in `Drone.tsx`: drei `RoundedBox` body (0.5×0.12×0.5), four arms at ±45° (boxes), four motor cylinders, per-rotor group `{2 blade boxes + a translucent disc}`, emissive LED strips (cyan front, red rear; `toneMapped={false}`, color×2). Rotors use directions `[1,-1,-1,1]`.
```tsx
useFrame((st, dt) => {
  const climb = currentTangentY;                                  // from rig via store or ref (0..1 normalized)
  const w = W0 + KC*climb;                                        // W0 = 2π·14, KC ≈ 20
  rotors.forEach((r,i) => { r.group.rotation.y += DIR[i]*w*Math.min(dt,1/20); });
  const disc = smoothstep(30, 70, w); setBladeOpacity(1-disc); setDiscOpacity(0.35*disc);
  const t = st.clock.elapsedTime;
  body.position.y = 0.03*Math.sin(2*Math.PI*0.4*t) + 0.012*Math.sin(2*Math.PI*0.92*t + 1.3);   // 6.8
});
```
GLB variant: keep the same rotor logic by node name; drive `rotation.y` of rotor nodes.

### 7.6 Black-box capsule shader
```tsx
// components/canvas/BlackBox.tsx ("use client")
import * as THREE from "three"; import { shaderMaterial } from "@react-three/drei"; import { extend, useFrame } from "@react-three/fiber";
import { useUI } from "@/lib/store";
const vert = /* glsl */`
varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
void main(){ vPos = position; vNormal = normalize(normalMatrix*normal);
  vec4 mv = modelViewMatrix*vec4(position,1.0); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const frag = /* glsl */`
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
  gl_FragColor = vec4(base*(0.25 + fres*1.5) + base*edge*3.0, 1.0);   // raw HDR output feeds Bloom
}`;
const CapsuleMat = shaderMaterial({ uProgress:1, uTamper:0, uColor:new THREE.Color("#ff6a00"), uAlert:new THREE.Color("#ff2d2d") }, vert, frag);
extend({ CapsuleMat });
export function BlackBox({ sealed = 1 }: { sealed?: number }) {
  const ref = useMemo(() => ({ mat: null as any }), []);
  useFrame((_, dt) => {
    const { tamperIndex } = useUI.getState();
    ref.mat.uProgress = THREE.MathUtils.damp(ref.mat.uProgress, sealed, 3, dt);
    ref.mat.uTamper = THREE.MathUtils.damp(ref.mat.uTamper, tamperIndex === null ? 0 : 1, 6, dt);
  });
  return (<mesh><capsuleGeometry args={[0.18, 0.5, 8, 24]} /><capsuleMat ref={(m:any)=>{ref.mat=m;}} toneMapped={false} /></mesh>);
}
```
(Add `useMemo` import and the JSX type declaration for `capsuleMat`; Claude Code to handle TS typing per the current R3F version.)

### 7.7 Trails with divergence
```ts
// components/canvas/Trails.tsx (geometry helper)
export function makeTube(curve: THREE.Curve<THREE.Vector3>, segs = 400, radius = 0.03, radial = 8) {
  const geo = new THREE.TubeGeometry(curve, segs, radius, radial, false);
  const frames = curve.computeFrenetFrames(segs, false);
  const dir = new Float32Array(geo.attributes.position.count * 3); let k = 0;
  for (let i = 0; i <= segs; i++) { const b = frames.binormals[i]; for (let j = 0; j <= radial; j++) { dir[k++]=b.x; dir[k++]=b.y; dir[k++]=b.z; } }
  geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3)); return geo;       // vertex order is i-major: (segs+1)*(radial+1)
}
```
```glsl
// vertex
uniform float uDiverge, uDelta, uS0, uW; attribute vec3 aDir; varying float vS;
void main(){ vS = uv.x; float k = smoothstep(uS0, uS0+uW, uv.x);
  vec3 p = position + aDir*uDelta*uDiverge*k; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }
// fragment
uniform float uReveal, uDiverge, uS0, uW, uGlow; uniform vec3 uBase, uAlert; varying float vS;
void main(){ if (vS > uReveal) discard;
  float k = uDiverge*smoothstep(uS0, uS0+uW, vS);
  gl_FragColor = vec4(mix(uBase, uAlert, k)*uGlow, 1.0); }
```
- RecordedTrail: `uDiverge = 0` always, base cyan, glow 2.0.
- ClaimedTrail: base `#9fb3c8` (pale ghost) when valid, `uDiverge` animated 0→1 on tamper, base mixes to amber/red.
- Both: `uReveal` driven by scroll progress inside the Two-Truths range, so the trails draw as you scroll.

### 7.8 Hash chain (instanced)
```tsx
// components/canvas/HashChain.tsx ("use client")
const dummy = new THREE.Object3D(), cV = new THREE.Color("#22d3ee"), cB = new THREE.Color("#ff3b30"), tmp = new THREE.Color();
// placement: for i in 0..N-1: u=(i+0.5)/N; dummy.position = telemetryCurve.getPointAt(u); dummy.lookAt(getPointAt(min(1,u+1/N)))
// geometry: boxGeometry [0.12,0.12,0.22]; material: meshBasicMaterial toneMapped={false}; setColorAt(i, cV.clone().multiplyScalar(2.2))
useFrame(() => {
  const { tamperIndex, tamperClock } = useUI.getState(); if (tamperIndex === null || tamperClock === null) return;
  const now = performance.now()/1000 - tamperClock, N = count, t = tamperIndex, TC = 1.2;
  for (let i = t; i < N; i++) {
    const tau = ((i - t) / Math.max(1, N - 1 - t)) * TC;
    const k = easeOutCubic((now - tau) / 0.25);                   // 6.12
    tmp.lerpColors(cV, cB, k).multiplyScalar(2.2); mesh.setColorAt(i, tmp);
  }
  mesh.instanceColor!.needsUpdate = true;
  if (now > TC + 0.45 && useUI.getState().verdict !== "fail") useUI.getState().setVerdict("fail");
});
// picking: onPointerDown={(e)=>{ e.stopPropagation(); select(e.instanceId!); }}
```
`resetTamper` must reset all instance colors to verified cyan.

### 7.9 Effects and canvas shell
```tsx
<Canvas dpr={[1, 1.75]} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 42, near: 0.1, far: 400 }}>
  <PerformanceMonitor onDecline={() => setQuality(quality === "high" ? "medium" : "low")} />
  <color attach="background" args={["#05070a"]} /><fog attach="fog" args={["#05070a", 18, 90]} />
  <Environment files="/hdri/env-1k.hdr" environmentIntensity={0.6} />
  <FlightRig><Drone /></FlightRig> <TelemetryGroup /> <Stations /> <BlackBoxProblem />
  {quality !== "low" && (<EffectComposer multisampling={quality === "high" ? 4 : 0}>
    <Bloom intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur />
    <Vignette offset={0.3} darkness={0.6} /></EffectComposer>)}
</Canvas>
```
Load the Canvas with `next/dynamic({ ssr:false })`, wrap it in `<Suspense fallback={<Loader/>}>`, and add an error boundary with a static poster fallback if WebGL is unavailable.

### 7.10 Stations (spec; bind each to store)
- **ZeroGRing:** a torus plus a particle stream (6.16) from the drone to the ring. Block cubes "dock" into the ring (scale pulse) as the section progresses. Label: "Decided and recorded on 0G".
- **ChainlinkGate:** two pillars plus a scanning plane (a sine sweep of emissive intensity). The gate color follows `verdict` through damped lerp: idle gray, pending amber pulse, pass green, fail red with a short shake (amplitude 0.05, 8 Hz, decays exp(−6t)). Label: "Judged by Chainlink".
- **ArcPulse:** instanced spheres flowing along a Bézier from the gate to a payout node. `pass` means flow. `fail` means the flow stops at the gate and particles scatter (random outward velocity, damped) and fade. Label: "Settled on Arc". The payout node shows tx hash and explorer link only when real or replay data exists.

---

## 8. Scroll choreography (section ranges in u)

| Section | u range | 3D | DOM |
|---|---|---|---|
| Hero | 0.00-0.12 | Drone hovering, rim light, rotor spin-up, bloom | H1, sub, 2 CTAs, ModeBadge |
| Problem | 0.12-0.26 | Crash moment; orange black-box capsule dissolves in (uProgress 0→1) and detaches | "Today, the operator holds the only record" |
| Two Truths | 0.26-0.50 | Telemetry group (fit box 36) with recorded and claimed trails drawing, hash chain, tamper playground | TamperPanel, chain legend, hash chips |
| 0G | 0.50-0.64 | ZeroGRing + particle stream | Short explainer + record ID chip |
| Chainlink | 0.64-0.78 | ChainlinkGate scanning | Verdict pill, request ID chip |
| Arc | 0.78-0.90 | ArcPulse flow | Payment status, tx chip |
| Live Verify | 0.90-1.00 | Camera lands near the capsule | Verify-a-record form, evidence export, footer |

Telemetry group anchor: `storyCurve.getPointAt(0.38)` offset (0,-2,0); the story drone passes through it. Tune with leva (dev only).

---

## 9. Design system and UX

**Tokens (map into Tailwind config; no hardcoded hex in components):**
```
bg #05070A | surface #0B0F14 | surface-2 #111821 | border rgba(255,255,255,0.08)
text #E6EDF3 | muted #8B98A5
verified/cyan #22D3EE | pending/amber #F5A524 | danger #FF3B30 | pass #22C55E | capsule #FF6A00
radius 12px (cards) 999px (pills) | spacing 4-pt scale
font: Geist Sans (UI) + Geist Mono (hashes, telemetry) via next/font
type: h1 clamp(2.5rem, 6vw, 5rem) tight tracking | body 16/1.6 | mono 13
motion: 150ms hover | 300ms UI | 600ms reveals | 1200ms cascade; ease cubic-bezier(0.22,1,0.36,1)
```
**Look:** near-black, one accent, thin 1px borders, restrained glow (only HDR-emissive things glow), generous whitespace, mono for all data. No gradients as decoration, no stock imagery.

**Copy (exact tone: confident, short):**
- H1: "The black box drones can't lie to."
- Sub: "Independent. Tamper-evident. Every decision recorded on 0G, judged by Chainlink, settled on Arc."
- CTAs: "Watch a flight" (scrolls) / "Try to tamper" (jumps to Two Truths)
- Playground label: "Local simulation: nothing you change here touches a real record."

**Tamper playground UX flow:**
1. Chain is visible with all blocks cyan. Hint: "Pick a block. Change one number."
2. Select a block (click in 3D OR use the keyboard/list control; the 3D click is not accessible by itself). The panel shows that block's samples; the user edits altitude or speed (slider plus numeric input).
3. "Apply change" computes `tamper()`, `buildChain()`, `firstMismatch()` vs the original and calls `startTamper(t, delta)`. Cascade, divergence and verdict run (6.11-6.12).
4. Panel shows: "Block 41 changed -> 49 of 90 hashes no longer match -> Verdict: FAIL -> Payment: BLOCKED".
5. "Reset" restores everything. Reduced-motion users get the end state instantly with no animation.

**States for every data panel:** loading skeleton, error with retry, empty with a "load sample flight" action. Mode badge: `LIVE` (green dot), `REPLAY` (amber), `SANDBOX` (cyan).

**Accessibility:** semantic landmarks, AA contrast, visible focus rings, all 3D-only interactions have DOM equivalents, `aria-live="polite"` announces verdict changes, alt text and descriptions for the canvas ("Decorative 3D scene; all information is available in the text sections"), keyboard shortcut `T` jumps to the playground.

**Responsive:** below 768px or on coarse pointers, quality starts at `low`: no postprocessing, no transmission, fewer blocks drawn (downsample ×2), simplified camera keys, stacked DOM layout. Test at 390×844.

---

## 10. Features (priority)

- **P0 Two Truths + Tamper playground** (the memorable moment).
- **P0 Replay mode** (works offline from `sample-flight.json`; also the demo-failure fallback).
- **P0 Mode badge + honest labels.**
- **P1 Verify-a-record:** paste a record ID, the adapter loads it, the client recomputes the chain (`verify`), and the UI shows OK or "first bad block N" plus 0G, Chainlink and Arc links.
- **P1 Evidence export:** download JSON `{recordId, chain hashes, verdict, payment, verifiedAt, clientVerification}`.
- **P2 Keyboard shortcuts, shareable `?record=<id>` links, subtle sound off by default (skip if short on time).
- **Cut order if behind:** GPGPU particles → glass/reflections → keyboard shortcuts → share links. Never cut P0.

---

## 11. Task list (execute in order; one commit each)

| ID | Task | Acceptance |
|---|---|---|
| UI-0 | Preflight: read repo, baseline checks, branch | Summary posted, baseline reported |
| UI-1 | Foundation: deps, tokens, layout, ScrollProvider, store, quality tiers, Canvas shell with env + fog + loader + WebGL fallback | Page builds, canvas renders, no console errors |
| UI-2 | Logic layer: types, hash, geo, math, adapter(replay), generator script, vitest | `npm test` green (see 12.1) |
| UI-3 | Drone (procedural; GLB optional) with hover and rotors | Screenshot looks premium; no per-frame allocations |
| UI-4 | Story curve, FlightRig, camera keys, banking | Drone follows scroll smoothly; banks into turns; no camera roll |
| UI-5 | Two Truths: telemetry group, trails with divergence shader, HashChain instances | Trails overlap when valid; split when `uDiverge`=1 |
| UI-6 | BlackBox capsule shader + Problem section | Dissolve-in works; turns red on tamper |
| UI-7 | Tamper playground (panel, picking, a11y alternative, cascade, verdict) | Full flow < 1.7 s; reset works; reduced-motion path works |
| UI-8 | Stations (0G, Chainlink, Arc) bound to store | Gate colors follow verdict; Arc flow blocks on fail |
| UI-9 | Live Verify + Evidence export + live adapter per specs/04 | Replay and live both work; failures fall back to replay with badge |
| UI-10 | Polish, perf tiers, mobile, reduced motion, SEO/OG/favicon, deploy | Production checklist (Section 12.3) passes |

The per-task, polish and production prompts are saved verbatim in `prompts/`.

---

## 12. Testing, performance, production

**12.1 Unit tests (vitest):**
- Hash determinism: same blocks → same chain.
- Tamper: editing block t gives `firstMismatch == t` and mismatches for ALL i ≥ t, none before t.
- `q.*` bounds: lat/lon fit int32; heading in [0, 35999].
- `toENU` returns (0, alt, 0) at the origin; ±1° latitude ≈ 111 km north.
- `damp` frame-rate independence: 2 steps of dt/2 equal 1 step of dt (tolerance 1e-9).
- `smoothDamp` step response never overshoots.

**12.2 E2E (Playwright):** load page, canvas present, no console errors, screenshots at the 7 scroll positions × 2 viewports, tamper flow ends in `verdict=fail` and "BLOCKED" text. FPS sampling over rAF is advisory only (headless uses software rendering).

**12.3 Production checklist:**
- Dispose geometries, materials and textures on unmount; no allocations in `useFrame`.
- 3D chunk lazy-loaded; poster image fallback; branded loader with real progress (`useProgress`).
- Quality tiers + PerformanceMonitor; `prefers-reduced-motion` honored; mobile tested on a real phone.
- Lighthouse: Performance ≥ 85 desktop, Accessibility ≥ 95.
- OG image/favicon (Canva), meta tags, clean 404; deployed to Vercel with a public URL BEFORE the submission deadline.
- `CREDITS.md` lists model, HDRI, fonts; `AI_USAGE.md` is current.

**12.4 CLAUDE.md addendum:** applied in `CLAUDE.md` ("## UI / 3D rules").

---

## 13. Compliance and logging

- After each task append to `AI_USAGE.md`: `UI-<n> | files | what AI generated | what the human reviewed/changed`.
- Keep this spec and every prompt used in `prompts/` (the judges want the direction trail).
- The human must be able to explain: the hash chain, the divergence shader, the banking math, and why the playground is labeled a simulation. Read every file before committing.

## 14. Known risks

- Hash encoding must match the backend before any "matches 0G" claim.
- `shaderMaterial` and JSX typing differ between R3F v8 and v9; follow Context7.
- Bloom, transmission and reflections are expensive on weak GPUs; the quality tiers exist for that reason.
- A beautiful site on a mocked backend loses to a plain site on a working one; wire live data (UI-9) before polishing.
