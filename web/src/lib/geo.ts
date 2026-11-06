// GPS -> local scene coordinates (specs/05-uiux.md 6.1, 5 `q`). Today's flights come from the simulator in metres
// (specs/05a D4), so this is for real GPS telemetry later; it is unit-tested now.
export const R_EARTH = 6378137;
const RAD = Math.PI / 180;

/** equirectangular: fine under a few km. Returns three.js (east, altitude, -north). */
export function toENU(lat: number, lon: number, alt: number, lat0: number, lon0: number): [number, number, number] {
  const east = (lon - lon0) * RAD * R_EARTH * Math.cos(lat0 * RAD);
  const north = (lat - lat0) * RAD * R_EARTH;
  return [east, alt, -north];
}

/** float -> integer quantization, done once at ingestion so hashing stays deterministic */
export const q = {
  deg: (d: number) => Math.round(d * 1e7),
  mm: (m: number) => Math.round(m * 1000),
  hdg: (deg: number) => Math.round((((deg % 360) + 360) % 360) * 100) % 36000,
};
