"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARC_EXPLORER, buildTimeline, type FlightFile, sampleAt, sceneAt, scenarioLabel, ZG_EXPLORER } from "@/lib/flight";
import { EventFeed } from "./EventFeed";
import { Badge, cx, HashLink, Panel, Stat } from "./ui";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-slate-500">Loading 3D world…</div> });

const SPEEDS = [1, 2, 4, 8];
const MARK: Record<string, string> = { ok: "bg-emerald-400", deny: "bg-rose-400", warn: "bg-amber-400", info: "bg-sky-400/60", breach: "bg-rose-500" };

export default function FlightReplay({ flight, autoplay = true, compact = false }: { flight: FlightFile; autoplay?: boolean; compact?: boolean }) {
  const tl = useMemo(() => buildTimeline(flight), [flight]);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(2);
  const [follow, setFollow] = useState(false);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (ts: number) => {
      const dt = last.current === null ? 0 : (ts - last.current) / 1000;
      last.current = ts;
      setT((x) => {
        const n = x + dt * speed;
        if (n >= tl.duration) {
          if (compact) return 0;
          setPlaying(false);
          return tl.duration;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, speed, tl.duration, compact]);

  const seek = useCallback((x: number) => setT(Math.max(0, Math.min(tl.duration, x))), [tl.duration]);
  const s = sampleAt(tl.samples, t);
  const scene = sceneAt(tl.scenes, t);
  const trail = useMemo(() => tl.samples.filter((x) => x.t <= t).map((x) => ({ pos: x.pos, alt: x.alt })).concat([{ pos: s.pos, alt: s.alt }]), [tl.samples, t, s.pos, s.alt]);
  const lastEvent = [...tl.events].reverse().find((e) => e.t <= t);
  const status = lastEvent?.status === "breach" ? "breach" : lastEvent?.status === "deny" ? "deny" : lastEvent?.status === "warn" ? "warn" : "ok";
  const markers = tl.events
    .filter((e) => (e.kind === "situation" || e.status === "deny" || e.status === "breach") && e.t <= t)
    .map((e) => {
      const p = sampleAt(tl.samples, e.t);
      return { pos: p.pos, alt: p.alt, color: e.status === "ok" ? "#a78bfa" : e.status === "warn" ? "#fbbf24" : "#f43f5e" };
    });
  const speedNow = Math.hypot(s.vel[0], s.vel[1]);

  const scenePane = (
    <div className={cx("relative overflow-hidden rounded-2xl border border-white/10 bg-black", compact ? "h-full" : "h-[58vh] min-h-[420px]")}>
      <Scene3D permit={tl.permit} drone={{ pos: s.pos, alt: s.alt, vel: s.vel, status }} trail={trail} people={scene.people} props={scene.props} markers={markers} follow={follow} compact={compact} />
      {!compact && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            <Badge tone="zg">0G decides + records</Badge>
            <Badge tone={flight.report.verdict === "BREACH" ? "deny" : "ok"}>Verdict: {flight.report.verdict}</Badge>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 grid grid-cols-2 gap-1.5 text-right sm:grid-cols-4">
            {[
              ["ALT", `${s.alt.toFixed(2)} m`, s.alt > tl.permit.altCeilingM],
              ["SPEED", `${speedNow.toFixed(2)} m/s`, false],
              ["BATTERY", `${Math.round(s.battery * 100)}%`, s.battery < tl.permit.minBatteryReserve + 0.2],
              ["WIND", `${s.windMs.toFixed(0)} m/s`, s.windMs > tl.permit.maxWindMs],
            ].map(([k, val, bad]) => (
              <div key={k as string} className={cx("rounded-lg border bg-black/55 px-2.5 py-1.5 backdrop-blur", bad ? "border-rose-400/50" : "border-white/10")}>
                <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">{k}</div>
                <div className={cx("font-mono text-sm tabular-nums", bad ? "text-rose-300" : "text-slate-100")}>{val}</div>
              </div>
            ))}
          </div>
          {lastEvent && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 mx-auto max-w-xl rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-center backdrop-blur">
              <div className="text-sm font-semibold text-white">{lastEvent.title}</div>
              {lastEvent.detail && <div className="truncate text-xs text-slate-400">{lastEvent.detail}</div>}
            </div>
          )}
          <button onClick={() => setFollow((f) => !f)} className="absolute bottom-3 right-3 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-xs text-slate-200 backdrop-blur hover:bg-white/10">
            {follow ? "Free camera" : "Chase camera"}
          </button>
        </>
      )}
    </div>
  );
  if (compact) return scenePane;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        {scenePane}
        {/* player */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => (t >= tl.duration ? (setT(0), setPlaying(true)) : setPlaying((p) => !p))} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105">
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M7 4.5v15l12-7.5z" /></svg>
              )}
            </button>
            <div className="relative flex-1">
              <div className="relative h-8">
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
                <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${(t / tl.duration) * 100}%` }} />
                {tl.events
                  .filter((e) => e.kind !== "action" || e.status === "breach")
                  .map((e) => (
                    <button key={`${e.seq}-${e.kind}`} title={e.title} onClick={() => seek(e.t)} className={cx("absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full", MARK[e.status])} style={{ left: `${(e.t / tl.duration) * 100}%` }} />
                  ))}
                <input type="range" min={0} max={tl.duration} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="timeline" />
              </div>
            </div>
            <span className="w-24 text-right font-mono text-xs tabular-nums text-slate-300">
              {t.toFixed(1)}s / {tl.duration.toFixed(0)}s
            </span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {SPEEDS.map((x) => (
                <button key={x} onClick={() => setSpeed(x)} className={cx("px-2 py-1 font-mono text-xs", speed === x ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/5")}>
                  {x}×
                </button>
              ))}
            </div>
          </div>
        </div>
        <ProofPanels flight={flight} />
      </div>
      <Panel title="Decision feed" icon={<span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />} right={<span className="font-mono text-[11px] text-slate-500">{tl.events.filter((e) => e.t <= t).length}/{tl.events.length}</span>} className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto pr-1 xl:max-h-[calc(100vh-11rem)]">
          <EventFeed events={tl.events} now={t} onSeek={seek} />
        </div>
      </Panel>
    </div>
  );
}

function ProofPanels({ flight }: { flight: FlightFile }) {
  const r = flight.report;
  const zg = r.decisions.filter((d) => d.source.startsWith("0G")).length;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="0G: decisions + black box" icon={<span className="text-violet-300">◆</span>}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="0G decisions" value={zg} sub={`of ${r.decisions.length} checks`} />
          <Stat label="Record" value={r.ok ? "Intact" : "Broken"} tone={r.ok ? "good" : "bad"} sub={`${r.records} signed records`} />
        </div>
        <div className="mt-3 space-y-2 text-xs">
          <Row k="Flight on 0G Chain"><HashLink hash={flight.chain.chainFlightId} href={flight.chain.openTx ? `${ZG_EXPLORER}/tx/${flight.chain.openTx}` : undefined} /></Row>
          <Row k="Operator (signer)"><HashLink hash={flight.chain.operator} href={`${ZG_EXPLORER}/address/${flight.chain.operator}`} /></Row>
          {flight.segments.map((s) => (
            <Row key={s.index} k={`Storage seg ${s.index} · #${s.fromSeq}-${s.toSeq}`}>
              <HashLink hash={s.rootHash} href={`${ZG_EXPLORER}/tx/${s.storageTx}`} />
            </Row>
          ))}
          {flight.segments.map((s) => (
            <Row key={`a${s.index}`} k={`Anchor seg ${s.index}`}>
              <HashLink hash={s.anchorTx} href={`${ZG_EXPLORER}/tx/${s.anchorTx}`} />
            </Row>
          ))}
        </div>
      </Panel>
      <Panel title="Chainlink: the judge's rules" icon={<span className="text-blue-300">⬡</span>}>
        <div className={cx("rounded-xl border px-3 py-2.5", r.verdict === "BREACH" ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10")}>
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Verdict</div>
          <div className={cx("text-xl font-bold", r.verdict === "BREACH" ? "text-rose-300" : "text-emerald-300")}>{r.verdict}</div>
          <div className="text-xs text-slate-400">{r.verdict === "BREACH" ? "Objective rule broken: auto-pay the victim" : "No rule broken: hold for the insurer"}</div>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs">
          {[
            ["B1", "Left the area / entered no-fly", "B1_GEOFENCE"],
            ["B2", "Above the altitude ceiling", "B2_ALTITUDE"],
            ["B3", "Acted without 0G approval", "B3_UNAPPROVED_ACTION"],
            ["B4", "Override after a DENY", "B4_OVERRIDE_ON_DENY"],
            ["B5", "Record broken / unanchored", "B5_RECORD_BROKEN"],
            ["B6", "Take-off in unsafe wind", "B6_UNSAFE_WIND_LAUNCH"],
          ].map(([k, label, code]) => {
            const n = r.breaches.filter((b) => b.code === code).length;
            return (
              <li key={k} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <span className="text-slate-300">
                  <span className="mr-2 font-mono text-slate-500">{k}</span>
                  {label}
                </span>
                {n ? <Badge tone="deny">✕ {n}</Badge> : <Badge tone="ok">✓</Badge>}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Arc: bond + payout" icon={<span className="text-cyan-300">●</span>}>
        {flight.claims.length === 0 ? (
          <p className="text-sm text-slate-400">No claim filed for this flight. The operator&apos;s USDC bond stays locked in the Arc escrow.</p>
        ) : (
          flight.claims.map((c) => (
            <div key={c.claimId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">Claim #{c.claimId}</span>
                <Badge tone={c.state === "Paid" ? "ok" : c.state === "Held" ? "warn" : "mute"}>{c.state}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Verdict" value={c.verdict} tone={c.verdict === "BREACH" ? "bad" : "warn"} />
                <Stat label="Payout cap" value={c.cap.replace(" USDC", "")} sub="USDC" />
              </div>
              <div className="space-y-1.5 text-xs">
                <Row k="Escrow"><HashLink hash={flight.arc.escrow} href={`${ARC_EXPLORER}/address/${flight.arc.escrow}`} /></Row>
                <Row k="Victim"><HashLink hash={c.victim} href={`${ARC_EXPLORER}/address/${c.victim}`} /></Row>
                {c.breachCode && <Row k="Breach code"><span className="font-mono text-rose-300">{c.breachCode}</span></Row>}
                <Row k="Judge report"><HashLink hash={c.reportHash} /></Row>
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{k}</span>
      {children}
    </div>
  );
}

export { scenarioLabel };
