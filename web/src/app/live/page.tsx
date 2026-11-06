"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventFeed } from "@/components/EventFeed";
import { Badge, cx, Panel, Stat } from "@/components/ui";
import type { FlightEvent, Permit, Person, Prop, XY } from "@/lib/flight";
import { deriveFx } from "@/lib/fx";

const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });
const WS_URL = process.env.NEXT_PUBLIC_OFFICER_WS || "ws://localhost:8787";
const LAG_S = 0.25; // draw slightly in the past (sim time) so there are always two samples to blend between

interface Seg {
  fromSeq: number;
  toSeq: number;
  anchorTx: string;
}

interface LiveState {
  t: number;
  pos: XY;
  alt: number;
  vel: [number, number, number];
  battery: number;
  windMs: number;
}

const TITLES: Record<string, string> = { OBSTACLE: "Obstacle ahead", PEOPLE_UNDER_PATH: "People under the path", CHOOSE_DROP_SPOT: "Choose the drop spot", ZONE_BLOCKED: "Drop zone blocked", EMERGENCY: "In-flight emergency" };

export default function Live() {
  const [conn, setConn] = useState<"connecting" | "open" | "closed">("connecting");
  const [permit, setPermit] = useState<Permit | null>(null);
  const [flightId, setFlightId] = useState<string | null>(null);
  const [state, setState] = useState<LiveState | null>(null);
  const [trail, setTrail] = useState<{ pos: XY; alt: number }[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [events, setEvents] = useState<FlightEvent[]>([]);
  const [frame, setFrame] = useState<{ src: string; label: string } | null>(null);
  const [netDown, setNetDown] = useState(false);
  const [closed, setClosed] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [published, setPublished] = useState<string | null>(null);
  const seq = useRef(0);
  const tNow = useRef(0);
  const buf = useRef<LiveState[]>([]);
  const clock = useRef<{ t: number; w: number } | null>(null);
  const lastHud = useRef(0);
  const lastTrail = useRef(0);

  useEffect(() => {
    let stop = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      const s = new WebSocket(WS_URL);
      ws.current = s;
      setConn("connecting");
      s.onopen = () => {
        setConn("open");
        s.send(JSON.stringify({ type: "watch" }));
      };
      s.onclose = () => {
        setConn("closed");
        if (!stop) retry = setTimeout(connect, 2000);
      };
      s.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        const push = (e: Omit<FlightEvent, "seq" | "hash" | "t">) => setEvents((x) => [...x, { ...e, t: tNow.current, seq: seq.current++, hash: "" }]);
        switch (m.type) {
          case "watching":
            setPermit(m.permit);
            setFlightId(m.flightId);
            break;
          case "flight":
            setFlightId(m.flightId);
            setTrail([]);
            setEvents([]);
            setPeople([]);
            setProps([]);
            setFrame(null);
            setClosed(null);
            setNetDown(false);
            setSegs([]);
            setPublished(null);
            buf.current = [];
            clock.current = null;
            seq.current = 0;
            push({ kind: "permit", title: `Flight opened (${m.scenario})`, detail: `permit ${String(m.permitHash).slice(0, 18)}…`, status: "info" });
            break;
          case "telemetry": {
            // keep every sample for smooth motion; refresh the readouts and trail at a calm rate
            const now = performance.now();
            tNow.current = m.state.t;
            const b = buf.current;
            if (b.length && m.state.t <= b[b.length - 1].t) b.length = 0; // sim restarted
            b.push(m.state);
            if (buf.current.length > 90) buf.current.splice(0, buf.current.length - 90);
            if (now - lastHud.current > 150) {
              lastHud.current = now;
              setState(m.state);
            }
            if (now - lastTrail.current > 300) {
              lastTrail.current = now;
              setTrail((x) => [...x.slice(-400), { pos: m.state.pos, alt: m.state.alt }]);
            }
            break;
          }
          case "sealed":
            setSegs((x) => [...x, { fromSeq: m.fromSeq, toSeq: m.toSeq, anchorTx: m.anchorTx }]);
            break;
          case "published":
            setPublished(m.flightId);
            break;
          case "scene":
            setPeople(m.people ?? []);
            setProps(m.props ?? []);
            if (m.event !== "setup") push({ kind: "scene", title: m.event, detail: "scene change", status: "info" });
            break;
          case "event":
            push({ kind: "event", title: m.event, detail: "", status: "warn" });
            break;
          case "decision": {
            const cmd = m.request.cmd;
            push({ kind: "decision", title: `${cmd.type} → ${m.verdict}${m.code && m.code !== "OK" ? ` ${m.code}` : ""}`, detail: m.reason, status: m.verdict === "ALLOW" ? "ok" : m.verdict === "DENY" ? "deny" : "warn", source: m.source, zgRequestId: m.zgRequestId, recordSeq: m.recordSeq, latencyMs: m.latencyMs ?? undefined });
            if (m.frame) setFrame({ src: `data:image/jpeg;base64,${m.frame}`, label: `${cmd.type} · ${m.verdict}` });
            break;
          }
          case "choice": {
            const sit = m.request.situation;
            const vetoed: Record<string, string> = Object.fromEntries((m.vetoed ?? []).map((v: { id: string; why: string }) => [v.id, v.why]));
            push({
              kind: "situation", title: `${TITLES[sit.kind] ?? sit.kind} → ${m.choice ?? "no decision"}`, detail: m.reason, status: m.choice ? "ok" : "warn", source: m.source, zgRequestId: m.zgRequestId, recordSeq: m.recordSeq, latencyMs: m.latencyMs ?? undefined,
              options: sit.options.map((o: { id: string; label: string }) => ({ id: o.id, label: o.label, vetoed: vetoed[o.id], chosen: o.id === m.choice })),
            });
            if (m.frame) setFrame({ src: `data:image/jpeg;base64,${m.frame}`, label: `${sit.kind} · ${m.choice ?? "no decision"}` });
            break;
          }
          case "action":
            push({ kind: "action", title: `${m.cmd.type === "MANEUVER" ? m.cmd.choice : m.cmd.type} executed`, detail: m.approved ? "with an approved 0G decision" : "WITHOUT any approval", status: m.approved ? "info" : "breach" });
            break;
          case "safe_stop":
            push({ kind: "safe_stop", title: `Safe stop: ${m.step}`, detail: `${m.detail}. No 0G decision claimed.`, status: "warn" });
            break;
          case "control":
            setNetDown(m.network === "down");
            break;
          case "closed":
            setClosed(m.flightId);
            push({ kind: "close", title: "Flight closed", detail: `${m.records} records, sealing on 0G…`, status: "info" });
            break;
        }
      };
    };
    connect();
    return () => {
      stop = true;
      clearTimeout(retry);
      ws.current?.close();
    };
  }, []);

  // Smooth playback on the sim's own clock: a local clock runs at real speed and is nudged towards
  // (newest sample - LAG_S), so network jitter never shows. Between samples the path is a cubic
  // Hermite curve through positions and velocities: no corners, no speed pumping.
  const getDrone = useCallback(() => {
    const b = buf.current;
    if (!b.length) return null;
    const now = performance.now();
    const newest = b[b.length - 1].t;
    const target = newest - LAG_S;
    let c = clock.current;
    if (!c || Math.abs(target - c.t) > 2) c = clock.current = { t: target, w: now };
    else {
      const err = target - c.t;
      c.t = Math.min(newest, c.t + ((now - c.w) / 1000) * Math.min(4, Math.max(0.2, 1 + err * 1.5)));
      c.w = now;
    }
    let i = b.length - 1;
    while (i > 0 && b[i - 1].t > c.t) i--;
    const s0 = b[Math.max(0, i - 1)];
    const s1 = b[i];
    const h = s1.t - s0.t;
    if (h <= 1e-6 || c.t >= s1.t) return { pos: s1.pos, alt: s1.alt, vel: s1.vel, status: "ok" as const };
    const u = Math.min(1, Math.max(0, (c.t - s0.t) / h));
    const lin = h > 0.4; // after a gap, don't trust velocities
    const u2 = u * u;
    const u3 = u2 * u;
    const [a0, a1, a2, a3] = lin ? [1 - u, 0, u, 0] : [2 * u3 - 3 * u2 + 1, u3 - 2 * u2 + u, -2 * u3 + 3 * u2, u3 - u2];
    const H = (p0: number, v0: number, p1: number, v1: number) => a0 * p0 + a1 * h * v0 + a2 * p1 + a3 * h * v1;
    const mix = (x: number, y: number) => x + (y - x) * u;
    return {
      pos: [H(s0.pos[0], s0.vel[0], s1.pos[0], s1.vel[0]), H(s0.pos[1], s0.vel[1], s1.pos[1], s1.vel[1])] as XY,
      alt: H(s0.alt, s0.vel[2], s1.alt, s1.vel[2]),
      vel: [mix(s0.vel[0], s1.vel[0]), mix(s0.vel[1], s1.vel[1]), mix(s0.vel[2], s1.vel[2])] as [number, number, number],
      status: "ok" as const,
    };
  }, []);
  const shown = useMemo(
    () => events.map((e) => (e.recordSeq == null ? e : { ...e, anchorTx: segs.find((g) => e.recordSeq! >= g.fromSeq && e.recordSeq! <= g.toSeq)?.anchorTx })),
    [events, segs],
  );

  const asked = events.filter((e) => e.kind === "decision" || e.kind === "situation");
  const lat = asked.map((e) => e.latencyMs ?? 0).filter((x) => x > 0);
  const last = events[events.length - 1];
  const status = last?.status === "breach" ? "breach" : last?.status === "deny" ? "deny" : last?.status === "warn" ? "warn" : "ok";
  const fx = state ? deriveFx(events, state.t, () => ({ pos: state.pos, alt: state.alt }), !!permit && state.windMs > permit.maxWindMs) : undefined;
  const toggleNet = () => ws.current?.send(JSON.stringify({ type: "control", network: netDown ? "up" : "down" }));

  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#15171a]">Live mission console</h1>
          <p className="mt-1 text-sm text-[#55595f]">Streams from the officer service while the PyBullet drone flies. Every decision below is being made by 0G right now.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={conn === "open" ? "ok" : conn === "connecting" ? "warn" : "deny"}>{conn === "open" ? "Officer connected" : conn === "connecting" ? "Connecting…" : "Officer offline"}</Badge>
          {flightId && <Badge tone="zg">{flightId}</Badge>}
          <button onClick={toggleNet} disabled={conn !== "open"} className={cx("rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40", netDown ? "border-[#b7dcd6] bg-[#ecf7f5] text-[#0f5f59]" : "border-[#f0c4c4] bg-[#fdf0f0] text-[#9b1c1c] hover:bg-[#fbe4e4]")}>
            {netDown ? "Restore 0G link" : "Cut 0G link"}
          </button>
        </div>
      </div>

      {conn !== "open" && (
        <Panel>
          <p className="text-sm text-[#33363b]">Start the officer and fly a mission to watch it live:</p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-[#f6f3ec] p-4 font-mono text-xs text-[#33363b]">{`cd officer; pnpm officer
cd sim; .venv\\Scripts\\python.exe mission.py --scenario full --gui`}</pre>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="relative h-[60vh] min-h-[440px] overflow-hidden rounded-lg border border-[#e3ded3] bg-[#dfe7ec]">
            {permit ? (
              <Scene3D permit={permit} drone={{ pos: state?.pos ?? permit.rallyPoints.HOME, alt: state?.alt ?? 0.05, vel: state?.vel ?? [0, 0, 0], status: fx?.label?.tone ?? status }} trail={trail} people={people} props={props} fx={fx} follow getDrone={getDrone} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-[#8a8d93]">Waiting for the officer…</div>
            )}
            {permit && state && (
              <div className={cx("pointer-events-none absolute left-3 flex gap-px overflow-hidden rounded-md border border-[#d9d3c6] bg-[#fffdf8]/95 text-[#15171a] shadow-sm", netDown ? "top-10" : "top-3")}>
                {[
                  ["ALT", `${state.alt.toFixed(2)} m`, state.alt > permit.altCeilingM],
                  ["SPEED", `${Math.hypot(state.vel[0], state.vel[1]).toFixed(2)} m/s`, false],
                  ["BATTERY", `${Math.round(state.battery * 100)}%`, state.battery < permit.minBatteryReserve + 0.2],
                  ["WIND", `${state.windMs.toFixed(0)} m/s`, state.windMs > permit.maxWindMs],
                  ["0G LINK", netDown ? "CUT" : "LIVE", netDown],
                ].map(([k, val, bad]) => (
                  <div key={k as string} className="px-3 py-1.5">
                    <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#8a8d93]">{k}</div>
                    <div className={cx("font-mono text-sm tabular-nums", bad ? "text-[#b91c1c]" : "text-[#15171a]")}>{val}</div>
                  </div>
                ))}
              </div>
            )}
            {netDown && <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#b91c1c] py-1.5 text-center text-xs font-semibold tracking-wide text-[#fff7f0]">LINK TO 0G CUT · the drone may not act until a safe stop</div>}
            {closed && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#d9d3c6] bg-[#fffdf8] px-4 py-1.5 text-xs text-[#3b2fa8]">
                {published ? (
                  <Link href={`/flights/${published}`} className="font-semibold underline">Sealed on 0G · open the replay and proof →</Link>
                ) : (
                  "Flight closed · sealing on 0G Storage + 0G Chain…"
                )}
              </div>
            )}
          </div>
          <div className="grid items-start gap-4 md:grid-cols-[1fr_320px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="0G decisions" value={`${asked.length}`} />
              <Stat label="Avg 0G answer" value={lat.length ? `${(lat.reduce((a, b) => a + b, 0) / lat.length / 1000).toFixed(1)} s` : "–"} />
              <Stat label="Sealed on 0G Chain" value={`${segs.length} seg${segs.length === 1 ? "" : "s"}`} />
              <Stat label="Sim time" value={`${(state?.t ?? 0).toFixed(1)} s`} />
            </div>
            <Panel title="What the drone saw" className="overflow-hidden">
              {frame ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frame.src} alt="drone camera frame" className="w-full rounded-lg border border-[#e3ded3]" />
                  <div className="mt-2 text-xs text-[#55595f]">{frame.label} · sent to 0G</div>
                </div>
              ) : (
                <p className="text-xs text-[#8a8d93]">Camera frames appear here when the drone asks 0G.</p>
              )}
            </Panel>
          </div>
        </div>
        <Panel title="Live decisions" icon={<span className="h-2 w-2 rounded-sm bg-[#c2410c]" />} className="xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto pr-1">{events.length ? <EventFeed events={shown} now={Number.POSITIVE_INFINITY} /> : <p className="text-sm text-[#8a8d93]">No flight yet.</p>}</div>
        </Panel>
      </div>
    </div>
  );
}
