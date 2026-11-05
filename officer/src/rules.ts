// Deterministic hard rules. These run before 0G and can only make a decision stricter.
import { type Permit, type XY, noFlyHit, outsideGeofence, pathPoints } from "./permit.js";

export type CmdType = "TAKEOFF" | "REROUTE" | "DROP" | "LAND";

export interface Cmd {
  type: CmdType;
  from: XY;
  to: XY;
  alt: number;
  zone?: string;
}

export interface DroneState {
  t: number;
  pos: XY;
  alt: number;
  vel: [number, number, number];
  battery: number;
  windMs: number;
  payload: boolean;
}

export type RuleCode = "OK" | "NFZ" | "GEOFENCE" | "ALT" | "WIND" | "BATTERY" | "PEOPLE_BELOW";

/** Battery needed to fly from `to` to the nearest rally point, plus the reserve. */
function batteryNeeded(permit: Permit, to: XY, reserve: number): number {
  const nearest = Math.min(...Object.values(permit.rallyPoints).map((r) => Math.hypot(r[0] - to[0], r[1] - to[1])));
  return reserve + nearest * 0.01;
}

export function checkHardRules(permit: Permit, cmd: Cmd, state: DroneState): { code: RuleCode; detail: string } {
  const pts = pathPoints(cmd.from, cmd.to);
  if (outsideGeofence(permit, pts)) return { code: "GEOFENCE", detail: "path leaves the permitted area" };
  const nf = noFlyHit(permit, pts);
  if (nf) return { code: "NFZ", detail: `path crosses no-fly zone ${nf}` };
  if (cmd.alt > permit.altCeilingM) return { code: "ALT", detail: `altitude ${cmd.alt} m above ceiling ${permit.altCeilingM} m` };
  if (cmd.type === "TAKEOFF" && state.windMs > permit.maxWindMs)
    return { code: "WIND", detail: `wind ${state.windMs} m/s above limit ${permit.maxWindMs}` };
  if (cmd.type !== "LAND" && state.battery < batteryNeeded(permit, cmd.to, permit.minBatteryReserve))
    return { code: "BATTERY", detail: `battery ${state.battery} too low to reach a rally point after this leg` };
  return { code: "OK", detail: "all hard rules pass" };
}

// ---- situation options -----------------------------------------------------------
export type XYZ = [number, number, number];

export interface SituationOption {
  id: string;
  label: string;
  via: XYZ[]; // waypoints the drone would fly; empty = stay where it is (wait / hold / none)
}

export interface Situation {
  kind: string;
  detail: string;
  options: SituationOption[];
}

/** Veto any option whose flight path breaks the permit. Returns the reason, or null if legal. */
export function vetoOption(permit: Permit & { batteryPerMetre?: number }, opt: SituationOption, state: DroneState): string | null {
  let from: XY = state.pos;
  let length = 0;
  for (const [x, y, alt] of opt.via) {
    const pts = pathPoints(from, [x, y]);
    if (outsideGeofence(permit, pts)) return "GEOFENCE: leaves the permitted area";
    const nf = noFlyHit(permit, pts);
    if (nf) return `NFZ: crosses no-fly zone ${nf}`;
    if (alt > permit.altCeilingM) return `ALT: ${alt} m above ceiling ${permit.altCeilingM} m`;
    length += Math.hypot(x - from[0], y - from[1]);
    from = [x, y];
  }
  const need = permit.minBatteryReserve + (permit.batteryPerMetre ?? 0.03) * length;
  if (opt.via.length && state.battery < need) return `BATTERY: needs ${need.toFixed(2)}, has ${state.battery}`;
  return null;
}
