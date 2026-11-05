"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { EventFeed } from "@/components/EventFeed";
import { Badge, cx, Panel, Stat } from "@/components/ui";
import type { FlightEvent, Permit, Person, Prop, XY } from "@/lib/flight";

const Scene3D = dynamic(() => import("@/components/Scene3D"), { ssr: false });
const WS_URL = process.env.NEXT_PUBLIC_OFFICER_WS || "ws://localhost:8787";

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
  const seq = useRef(0);
  const tNow = useRef(0);

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
            seq.current = 0;
            push({ kind: "permit", title: `Flight opened (${m.scenario})`, detail: `permit ${String(m.permitHash).slice(0, 18)}…`, status: "info" });
            break;
          case "telemetry":
            tNow.current = m.state.t;
            setState(m.state);
            setTrail((x) => [...x.slice(-800), { pos: m.state.pos, alt: m.state.alt }]);
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
            push({ kind: "decision", title: `${cmd.type} → ${m.verdict}${m.code && m.code !== "OK" ? ` ${m.code}` : ""}`, detail: m.reason, status: m.verdict === "ALLOW" ? "ok" : m.verdict === "DENY" ? "deny" : "warn", source: m.source, zgRequestId: m.zgRequestId });
            if (m.frame) setFrame({ src: `data:image/png;base64,${m.frame}`, label: `${cmd.type} · ${m.verdict}` });
            break;
          }
          case "choice": {
            const sit = m.request.situation;
            const vetoed: Record<string, string> = Object.fromEntries((m.vetoed ?? []).map((v: { id: string; why: string }) => [v.id, v.why]));
            push({
              kind: "situation", title: `${TITLES[sit.kind] ?? sit.kind} → ${m.choice ?? "no decision"}`, detail: m.reason, status: m.choice ? "ok" : "warn", source: m.source, zgRequestId: m.zgRequestId,
              options: sit.options.map((o: { id: string; label: string }) => ({ id: o.id, label: o.label, vetoed: vetoed[o.id], chosen: o.id === m.choice })),
            });
            if (m.frame) setFrame({ src: `data:image/png;base64,${m.frame}`, label: `${sit.kind} · ${m.choice ?? "no decision"}` });
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

  const last = events[events.length - 1];
  const status = last?.status === "breach" ? "breach" : last?.status === "deny" ? "deny" : last?.status === "warn" ? "warn" : "ok";
  const toggleNet = () => ws.current?.send(JSON.stringify({ type: "control", network: netDown ? "up" : "down" }));

  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Live mission console</h1>
          <p className="mt-1 text-sm text-slate-400">Streams from the officer service while the PyBullet drone flies. Every decision below is being made by 0G right now.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={conn === "open" ? "ok" : conn === "connecting" ? "warn" : "deny"}>{conn === "open" ? "Officer connected" : conn === "connecting" ? "Connecting…" : "Officer offline"}</Badge>
          {flightId && <Badge tone="zg">{flightId}</Badge>}
          <button onClick={toggleNet} disabled={conn !== "open"} className={cx("rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40", netDown ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25")}>
            {netDown ? "Restore 0G link" : "Cut 0G link"}
          </button>
        </div>
      </div>

      {conn !== "open" && (
        <Panel>
          <p className="text-sm text-slate-300">Start the officer and fly a mission to watch it live:</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 font-mono text-xs text-slate-300">{`cd officer; pnpm officer
cd sim; .venv\\Scripts\\python.exe mission.py --scenario full --gui`}</pre>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="relative h-[60vh] min-h-[440px] overflow-hidden rounded-2xl border border-white/10 bg-black">
            {permit ? (
              <Scene3D permit={permit} drone={{ pos: state?.pos ?? permit.rallyPoints.HOME, alt: state?.alt ?? 0.05, vel: state?.vel ?? [0, 0, 0], status }} trail={trail} people={people} props={props} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500">Waiting for the officer…</div>
            )}
            {netDown && <div className="pointer-events-none absolute inset-x-0 top-0 bg-rose-600/80 py-1.5 text-center text-xs font-semibold tracking-wide text-white">LINK TO 0G CUT · the drone may not act until a safe stop</div>}
            {closed && <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-violet-400/40 bg-black/70 px-4 py-1.5 text-xs text-violet-200 backdrop-blur">Flight closed · sealing on 0G Storage + 0G Chain</div>}
          </div>
          <div className="grid items-start gap-4 md:grid-cols-[1fr_320px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Altitude" value={`${(state?.alt ?? 0).toFixed(2)} m`} tone={permit && state && state.alt > permit.altCeilingM ? "bad" : undefined} />
              <Stat label="Battery" value={`${Math.round((state?.battery ?? 1) * 100)}%`} tone={state && permit && state.battery < permit.minBatteryReserve + 0.2 ? "warn" : undefined} />
              <Stat label="Wind" value={`${(state?.windMs ?? 0).toFixed(0)} m/s`} tone={state && permit && state.windMs > permit.maxWindMs ? "bad" : undefined} />
              <Stat label="Sim time" value={`${(state?.t ?? 0).toFixed(1)} s`} />
            </div>
            <Panel title="What the drone saw" className="overflow-hidden">
              {frame ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frame.src} alt="drone camera frame" className="w-full rounded-lg border border-white/10" />
                  <div className="mt-2 text-xs text-slate-400">{frame.label} · sent to 0G</div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Camera frames appear here when the drone asks 0G.</p>
              )}
            </Panel>
          </div>
        </div>
        <Panel title="Live decisions" icon={<span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />} className="xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto pr-1">{events.length ? <EventFeed events={events} now={Number.POSITIVE_INFINITY} /> : <p className="text-sm text-slate-500">No flight yet.</p>}</div>
        </Panel>
      </div>
    </div>
  );
}
