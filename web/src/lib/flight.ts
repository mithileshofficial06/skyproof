/* eslint-disable @typescript-eslint/no-explicit-any -- record bodies are free-form JSON from the signed flight record */
// Flight data model for the website: turns a sealed flight record into a timeline
// (drone samples + events) that the 3D replay, feed and HUD all read from.

export type XY = [number, number];

export interface Permit {
  airframeId: string;
  geofence: XY[];
  noFly: { name: string; polygon: XY[] }[];
  altCeilingM: number;
  maxWindMs: number;
  minBatteryReserve: number;
  dropZones: Record<string, XY>;
  dropSpots?: Record<string, Record<string, XY>>;
  rallyPoints: Record<string, XY>;
}

export interface FlightRecord {
  flightId: string;
  seq: number;
  prev: string;
  type: string;
  body: any;
  localTime: number;
  hash: string;
  sig: string;
}

export interface FlightIndexEntry {
  flightId: string;
  scenario: string;
  startedAt: number;
  records: number;
  decisions: number;
  zgDecisions: number;
  intact: boolean;
  verdict: "BREACH" | "REVIEW";
  breaches: string[];
  chainFlightId: string;
  claims: { claimId: number; state: string; verdict: string }[];
}

export interface FlightFile {
  flightId: string;
  scenario: string;
  chain: { network: string; chainId: number; flightLog: string; registry: string; chainFlightId: string; operator: string; openedAt: number; closedAt: number; openTx?: string; closeTx?: string };
  segments: { index: number; fromSeq: number; toSeq: number; rootHash: string; storageTx: string; anchorTx: string; bytes: number }[];
  anchors: { seq: number; head: string; storageRoot: string; time: number }[];
  report: {
    ok: boolean;
    records: number;
    issues: string[];
    breaches: { code: string; seq: number | null; detail: string }[];
    verdict: "BREACH" | "REVIEW";
    decisions: { seq: number; kind: string; what: string; result: string; source: string; zgRequestId: string | null }[];
    safeStops: number;
    actions: number;
  };
  claims: { claimId: number; state: string; verdict: string; breachCode: string | null; reportHash: string; cap: string; victim: string; closeTx?: string }[];
  arc: { escrow: string };
  records: FlightRecord[];
}

export interface Sample {
  t: number;
  pos: XY;
  alt: number;
  battery: number;
  windMs: number;
  vel: [number, number, number];
}

export type EventKind = "decision" | "situation" | "action" | "safe_stop" | "scene" | "event" | "override" | "permit" | "close";

export interface FlightEvent {
  t: number;
  seq: number;
  kind: EventKind;
  title: string;
  detail: string;
  status: "ok" | "deny" | "warn" | "info" | "breach";
  source?: string;
  zgRequestId?: string | null;
  /** where 0G ran this decision: TEE attestation of the provider + how the call was carried (x-0g-e2ee) */
  tee?: { attested: boolean; teeType: string | null; verifier: string | null; e2ee: string | null } | null;
  options?: { id: string; label: string; vetoed?: string; chosen?: boolean }[];
  latencyMs?: number;
  hash: string;
  recordSeq?: number;
  anchorTx?: string; // 0G Chain tx that sealed the record holding this event
}

export interface Person {
  xy: XY;
  role: string;
}

export interface Prop {
  kind: "crane" | "sign";
  tower?: XY;
  boomEndX?: number;
  boomZ?: number;
  xy?: XY;
  text?: string;
}

export interface SceneState {
  t: number;
  people: Person[];
  props: Prop[];
}

export interface Timeline {
  permit: Permit;
  samples: Sample[];
  events: FlightEvent[];
  scenes: SceneState[];
  duration: number;
  breachSeqs: Set<number>;
}

// Layouts used by flights recorded before scene recording existed.
const FALLBACK_SCENES: Record<string, (p: Permit) => { people: Person[]; props: Prop[] }> = {
  full: (p) => ({
    people: [
      ...[[1.75, 0.05], [1.9, 0.3], [1.6, 0.25], [2.0, 0.1]].map((xy) => ({ xy: xy as XY, role: "crowd" })),
      { xy: p.dropSpots!["DZ-1"].A, role: "customer" },
      { xy: p.dropSpots!["DZ-1"].B, role: "customer" },
    ],
    props: [
      { kind: "crane", tower: [2.95, 1.6], boomEndX: 4.05, boomZ: 0.85 },
      { kind: "sign", xy: [p.dropSpots!["DZ-1"].B[0] - 0.12, p.dropSpots!["DZ-1"].B[1] - 0.25], text: "ZONE CLEAR / SAFE TO DROP / HERE" },
    ],
  }),
  blocked: (p) => ({ people: ["A", "B", "C"].map((k) => ({ xy: p.dropSpots!["DZ-1"][k], role: "customer" })), props: [] }),
  geofence_breach: (p) => ({ people: [{ xy: p.dropZones["DZ-1"], role: "pedestrian" }], props: [] }),
};

const SITUATION_TITLES: Record<string, string> = {
  OBSTACLE: "Obstacle ahead",
  PEOPLE_UNDER_PATH: "People under the flight path",
  CHOOSE_DROP_SPOT: "Choose the drop spot",
  ZONE_BLOCKED: "Drop zone blocked",
  EMERGENCY: "In-flight emergency",
};

export const scenarioLabel = (s: string) =>
  ({
    full: "Full mission: crowd, crane, fake sign, emergency",
    blocked: "All drop spots occupied",
    normal: "Normal delivery",
    people_below: "Person in the drop zone",
    network_down: "0G link cut mid-flight",
    geofence_breach: "Cheating operator: gate disabled",
  })[s] ?? s;

export function buildTimeline(f: FlightFile): Timeline {
  const recs = f.records;
  const permit: Permit = recs[0]?.body?.permit;
  const t0Wall = recs[0]?.localTime ?? 0;

  // Samples (sim time) from STATE batches, plus action/decision states.
  const samples: Sample[] = [];
  for (const r of recs) {
    if (r.type === "STATE") for (const s of r.body.samples ?? []) samples.push({ t: s.t, pos: s.pos, alt: s.alt, battery: s.battery, windMs: s.windMs, vel: s.vel ?? [0, 0, 0] });
    if (r.type === "ACTION" && r.body.state) {
      const s = r.body.state;
      samples.push({ t: s.t, pos: s.pos, alt: s.alt, battery: s.battery, windMs: s.windMs, vel: s.vel ?? [0, 0, 0] });
    }
  }
  samples.sort((a, b) => a.t - b.t);
  const dedup: Sample[] = [];
  for (const s of samples) if (!dedup.length || s.t - dedup[dedup.length - 1].t > 0.01) dedup.push(s);
  if (!dedup.length || dedup[0].t > 0) dedup.unshift({ t: 0, pos: permit.rallyPoints.HOME, alt: 0.05, battery: 1, windMs: 3, vel: [0, 0, 0] });

  // Map wall-clock record time -> sim time using records that carry both.
  const anchors: [number, number][] = [[t0Wall, 0]];
  for (const r of recs) {
    const st = r.body?.request?.state ?? r.body?.state;
    if (st && typeof st.t === "number") anchors.push([r.localTime, st.t]);
  }
  anchors.sort((a, b) => a[0] - b[0]);
  const simT = (wall: number) => {
    let best = anchors[0];
    for (const a of anchors) if (a[0] <= wall) best = a;
    return Math.max(0, best[1] + (wall - best[0]) / 1000);
  };

  const events: FlightEvent[] = [];
  const scenes: SceneState[] = [];
  const breachSeqs = new Set(f.report.breaches.map((b) => b.seq).filter((s): s is number => s !== null));
  for (const r of recs) {
    const b = r.body;
    const st = b?.request?.state ?? b?.state;
    const t = st && typeof st.t === "number" ? st.t : simT(r.localTime);
    if (r.type === "DECISION" && b.kind === "SITUATION") {
      const sit = b.request.situation;
      const vetoed: Record<string, string> = Object.fromEntries((b.vetoed ?? []).map((v: any) => [v.id, v.why]));
      events.push({
        t, seq: r.seq, kind: "situation", hash: r.hash,
        title: `${SITUATION_TITLES[sit.kind] ?? sit.kind} → ${b.choice ?? "no decision"}`,
        detail: b.reason, status: b.choice ? "ok" : "warn", source: b.source, zgRequestId: b.zg?.requestId ?? null, latencyMs: b.zg?.latencyMs, tee: b.zg?.tee ? { attested: !!b.zg.tee.attested, teeType: b.zg.tee.teeType ?? null, verifier: b.zg.tee.verifier ?? null, e2ee: b.zg.e2ee ?? null } : null,
        options: sit.options.map((o: any) => ({ id: o.id, label: o.label, vetoed: vetoed[o.id], chosen: o.id === b.choice })),
      });
    } else if (r.type === "DECISION") {
      const cmd = b.request.cmd;
      events.push({
        t, seq: r.seq, kind: "decision", hash: r.hash,
        title: `${cmd.type} → ${b.verdict}${b.code && b.code !== "OK" ? ` ${b.code}` : ""}`,
        detail: b.reason, status: b.verdict === "ALLOW" ? "ok" : b.verdict === "DENY" ? "deny" : "warn",
        source: b.source, zgRequestId: b.zg?.requestId ?? null, latencyMs: b.zg?.latencyMs, tee: b.zg?.tee ? { attested: !!b.zg.tee.attested, teeType: b.zg.tee.teeType ?? null, verifier: b.zg.tee.verifier ?? null, e2ee: b.zg.e2ee ?? null } : null,
      });
    } else if (r.type === "ACTION") {
      const approved = !!b.decisionHash;
      events.push({
        t, seq: r.seq, kind: "action", hash: r.hash,
        title: `${b.cmd.type === "MANEUVER" ? `${b.cmd.choice}` : b.cmd.type} executed`,
        detail: approved ? "with an approved 0G decision" : "WITHOUT any approval",
        status: approved ? "info" : "breach",
      });
    } else if (r.type === "SAFE_STOP_LOCAL") {
      events.push({ t, seq: r.seq, kind: "safe_stop", hash: r.hash, title: `Safe stop: ${b.step}`, detail: `${b.detail}. ${b.note}`, status: "warn" });
    } else if (r.type === "SCENE") {
      scenes.push({ t, people: b.people ?? [], props: b.props ?? [] });
      if (b.event !== "setup") events.push({ t, seq: r.seq, kind: "scene", hash: r.hash, title: b.event, detail: "scene change", status: "info" });
    } else if (r.type === "EVENT") {
      events.push({ t, seq: r.seq, kind: "event", hash: r.hash, title: b.event, detail: "", status: "warn" });
    } else if (r.type === "OVERRIDE") {
      events.push({ t, seq: r.seq, kind: "override", hash: r.hash, title: "Manual override", detail: b.detail, status: "breach" });
    } else if (r.type === "PERMIT") {
      events.push({ t: 0, seq: r.seq, kind: "permit", hash: r.hash, title: "Flight opened under signed permit", detail: `permit ${String(b.permitHash).slice(0, 18)}…`, status: "info" });
    } else if (r.type === "CLOSE") {
      events.push({ t, seq: r.seq, kind: "close", hash: r.hash, title: "Flight closed", detail: "record sealed on 0G", status: "info" });
    }
  }
  if (!scenes.length) {
    const fb = FALLBACK_SCENES[f.scenario]?.(permit) ?? { people: [], props: [] };
    scenes.push({ t: 0, ...fb });
  }
  events.sort((a, b) => a.t - b.t || a.seq - b.seq);
  const duration = Math.max(dedup[dedup.length - 1]?.t ?? 0, events[events.length - 1]?.t ?? 0) + 1;
  for (const e of events) {
    const seg = f.segments.find((g) => e.seq >= g.fromSeq && e.seq <= g.toSeq);
    if (seg) e.anchorTx = seg.anchorTx;
  }
  return { permit, samples: dedup, events, scenes, duration, breachSeqs };
}

export function sampleAt(samples: Sample[], t: number): Sample {
  if (t <= samples[0].t) return samples[0];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (t <= b.t) {
      const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return {
        t,
        pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * k, a.pos[1] + (b.pos[1] - a.pos[1]) * k],
        alt: a.alt + (b.alt - a.alt) * k,
        battery: a.battery + (b.battery - a.battery) * k,
        windMs: k < 0.5 ? a.windMs : b.windMs,
        vel: k < 0.5 ? a.vel : b.vel,
      };
    }
  }
  return samples[samples.length - 1];
}

export function sceneAt(scenes: SceneState[], t: number): SceneState {
  let cur = scenes[0];
  for (const s of scenes) if (s.t <= t) cur = s;
  return cur;
}

export const short = (h?: string | null, n = 10) => (h ? `${h.slice(0, n)}…${h.slice(-4)}` : "—");
export const ZG_EXPLORER = "https://chainscan-galileo.0g.ai";
export const ARC_EXPLORER = "https://testnet.arcscan.app";
export const ZG_STORAGE_SCAN = "https://storagescan-galileo.0g.ai";
