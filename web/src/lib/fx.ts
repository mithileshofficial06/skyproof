// What should the 3D scene show right now? Derived from the flight's events at time t.
import type { FlightEvent, XY } from "./flight";
import type { SceneFx, Tone } from "@/components/Scene3D";

const TAG: Record<string, string> = {
  decision: "0G decision",
  situation: "0G decides a situation",
  action: "Drone action",
  safe_stop: "Safe stop · no 0G decision",
  event: "In flight",
  scene: "Scene",
  permit: "Flight",
  close: "Flight",
  override: "Override",
};

export function deriveFx(events: FlightEvent[], t: number, posAt: (t: number) => { pos: XY; alt: number }, windBad: boolean): SceneFx {
  const past = events.filter((e) => e.t <= t + 0.01);
  const last = [...past].reverse().find((e) => e.kind !== "scene" && t - e.t < 4);
  const drop = events.find((e) => e.kind === "action" && /^DROP\b/.test(e.title));
  const dropped = drop && t >= drop.t ? { pos: posAt(drop.t).pos, k: Math.min(1, (t - drop.t) / 0.8) } : null;
  const scanning = past.some((e) => (e.kind === "decision" || e.kind === "situation") && t - e.t < 1.4);
  const obstacle = [...past].reverse().find((e) => e.kind === "situation" && e.title.startsWith("Obstacle") && t - e.t < 4);
  let beamTo: [number, number, number] | null = null;
  if (obstacle) {
    const now = posAt(obstacle.t);
    const before = posAt(Math.max(0, obstacle.t - 1.5));
    const dx = now.pos[0] - before.pos[0];
    const dy = now.pos[1] - before.pos[1];
    const n = Math.hypot(dx, dy) || 1;
    const d = Number(/([\d.]+) m ahead/.exec(obstacle.detail ?? "")?.[1] ?? 0.45);
    beamTo = [now.pos[0] + (dx / n) * d, now.pos[1] + (dy / n) * d, now.alt];
  }
  const gust = windBad || past.some((e) => e.kind === "event" && /gust/i.test(e.title) && t - e.t < 8);
  const tone: Tone = last ? (last.status === "breach" ? "breach" : (last.status as Tone)) : "info";
  return {
    label: last ? { title: last.title, sub: last.detail, tone, tag: TAG[last.kind] + (last.latencyMs ? ` · ${(last.latencyMs / 1000).toFixed(1)} s` : "") } : undefined,
    scan: scanning,
    beamTo,
    gust,
    carrying: !drop || t < drop.t,
    dropped,
    safeStop: past.some((e) => e.kind === "safe_stop"),
  };
}
