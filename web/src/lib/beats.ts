// "Coming up" beats: just before each incident the replay pauses, the camera flies to it
// and a short card explains what is about to happen.
import { sampleAt, sceneAt, type Timeline } from "./flight";

export interface Beat {
  t: number; // when to pause (a little before the incident)
  at: number; // when the incident happens
  title: string;
  text: string;
  focus: [number, number, number];
}

const LEAD = 2.2;

export function buildBeats(tl: Timeline): Beat[] {
  const beats: Beat[] = [];
  const seen = new Set<string>();
  const add = (key: string, at: number, title: string, text: string, focus: [number, number, number]) => {
    if (seen.has(key)) return;
    seen.add(key);
    beats.push({ t: Math.max(0.3, at - LEAD), at, title, text, focus });
  };
  const dz = tl.permit.dropZones["DZ-1"];
  for (const e of tl.events) {
    const p = sampleAt(tl.samples, e.t);
    if (e.kind === "situation" && e.title.startsWith("Obstacle")) {
      const before = sampleAt(tl.samples, Math.max(0, e.t - 1.5));
      const dx = p.pos[0] - before.pos[0];
      const dy = p.pos[1] - before.pos[1];
      const n = Math.hypot(dx, dy) || 1;
      add("obstacle", e.t, "A crane is in the way", "It was raised after the route was planned. The drone's distance sensors will catch it and brake on their own, then 0G looks through the camera and chooses how to get past.", [p.pos[0] + (dx / n) * 0.45, p.pos[1] + (dy / n) * 0.45, p.alt]);
    } else if (e.kind === "situation" && e.title.startsWith("People under")) {
      const crowd = sceneAt(tl.scenes, e.t).people.filter((x) => x.role === "crowd");
      const c = crowd.length ? [crowd.reduce((a, x) => a + x.xy[0], 0) / crowd.length, crowd.reduce((a, x) => a + x.xy[1], 0) / crowd.length] : p.pos;
      add("crowd", e.t, "People under the flight path", "A crowd is standing below the next leg. Flying low over people is unsafe, so the drone stops and 0G picks another way. Options that break the permit are removed first.", [c[0], c[1], 0.15]);
    } else if (e.kind === "situation" && e.title.startsWith("Choose the drop")) {
      add("drop", e.t, "Arriving at the drop zone", "People are standing on two of the three spots, and a printed sign claims the zone is safe. 0G is told that text in the image is data, never instructions. Watch which spot it picks.", [dz[0], dz[1], 0.1]);
    } else if (e.kind === "situation" && e.title.startsWith("In-flight emergency")) {
      add("emergency", e.t, "A gust and a battery fault", "A 13 m/s gust and a battery cell fault hit on the way back. 0G must choose: carry on, hold, or land at the nearest safe pad. Carrying on is vetoed because the battery cannot make it.", [p.pos[0], p.pos[1], p.alt]);
    } else if (e.kind === "decision" && e.status === "deny" && /PEOPLE_BELOW/.test(e.title)) {
      add("deny", e.t, "Someone is standing under the drop", "Before releasing the package the drone asks 0G again. A person in the zone means DENY, and the drone waits.", [dz[0], dz[1], 0.1]);
    } else if (e.kind === "event" && /0G cut/i.test(e.title)) {
      add("cut", e.t, "The link to 0G is about to drop", "Without 0G there is no decision, and the drone must never invent one. Watch it hold, retry, then fly a pre-approved safe stop and land.", [p.pos[0], p.pos[1], p.alt]);
    } else if (e.kind === "action" && e.status === "breach") {
      add("breach", e.t, "The operator disabled the safety gate", "The drone will take a shortcut through the airport and drop over a person with no approvals. The record still captures every move, and that is what pays the victim.", [p.pos[0], p.pos[1], p.alt]);
    }
  }
  return beats.sort((a, b) => a.t - b.t);
}
