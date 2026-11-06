// Camera keyframes along the scroll (specs/05-uiux.md 7.3), blended with smoothstep.
// Wide screens push the hero drone right of the headline; tall screens pull back and stay centred.
import { smoothstep } from "./math";

export interface CamKey {
  u: number;
  dist: number;
  h: number;
  lat: number;
  look: number;
  fov: number;
}

export const KEYS: CamKey[] = [
  { u: 0.0, dist: 3.4, h: 0.8, lat: 0.0, look: 8, fov: 42 },
  { u: 0.12, dist: 4.0, h: 1.2, lat: -1.2, look: 6, fov: 46 },
  { u: 0.26, dist: 9.0, h: 4.0, lat: 0.0, look: 10, fov: 50 },
  { u: 0.5, dist: 4.5, h: 1.0, lat: 1.5, look: 6, fov: 44 },
  { u: 0.64, dist: 4.5, h: 0.8, lat: -1.5, look: 6, fov: 44 },
  { u: 0.78, dist: 4.5, h: 1.0, lat: 1.5, look: 6, fov: 44 },
  { u: 0.9, dist: 2.2, h: 0.4, lat: 0.0, look: 3, fov: 38 },
  { u: 1.0, dist: 1.2, h: 0.2, lat: 0.0, look: 2, fov: 34 },
];

export const KEYS_WIDE: CamKey[] = KEYS.map((k, i) => (i === 0 ? { ...k, lat: -1.3 } : k));
// on tall screens the hero camera starts a little below the drone, so it floats above the headline
export const KEYS_TALL: CamKey[] = KEYS.map((k, i) => ({ ...k, dist: k.dist + 1.6, lat: 0, fov: k.fov + 8, h: i === 0 ? -0.35 : k.h }));

export const camOut: Omit<CamKey, "u"> = { dist: 0, h: 0, lat: 0, look: 0, fov: 0 };

/** writes into `out` (no allocation per frame) */
export function sampleCam(u: number, keys: CamKey[] = KEYS, out = camOut) {
  let i = 0;
  while (i < keys.length - 2 && u >= keys[i + 1].u) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = smoothstep(a.u, b.u, u);
  out.dist = a.dist + (b.dist - a.dist) * t;
  out.h = a.h + (b.h - a.h) * t;
  out.lat = a.lat + (b.lat - a.lat) * t;
  out.look = a.look + (b.look - a.look) * t;
  out.fov = a.fov + (b.fov - a.fov) * t;
  return out;
}
