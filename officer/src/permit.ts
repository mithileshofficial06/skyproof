// The signed flight permit (scenarios/permit.json) and the geometry used by the hard rules.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export type XY = [number, number];

export interface Permit {
  v: number;
  airframeId: string;
  validFrom: number;
  validTo: number;
  geofence: XY[];
  noFly: { name: string; polygon: XY[] }[];
  altCeilingM: number;
  maxWindMs: number;
  minBatteryReserve: number;
  dropZones: Record<string, XY>;
  rallyPoints: Record<string, XY>;
  visionModel: string;
}

const PERMIT_PATH = fileURLToPath(new URL("../../scenarios/permit.json", import.meta.url));

export function loadPermit(): { permit: Permit; permitText: string; permitHash: string } {
  const permitText = readFileSync(PERMIT_PATH, "utf8");
  const permitHash = "0x" + createHash("sha256").update(permitText).digest("hex");
  return { permit: JSON.parse(permitText) as Permit, permitText, permitHash };
}

export function pointInPolygon([x, y]: XY, poly: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Sample the straight path from a to b every 5 cm. */
export function pathPoints(a: XY, b: XY, step = 0.05): XY[] {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(d / step));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as XY);
}

export function noFlyHit(permit: Permit, pts: XY[]): string | null {
  for (const nf of permit.noFly) if (pts.some((p) => pointInPolygon(p, nf.polygon))) return nf.name;
  return null;
}

export function outsideGeofence(permit: Permit, pts: XY[]): boolean {
  return pts.some((p) => !pointInPolygon(p, permit.geofence));
}
