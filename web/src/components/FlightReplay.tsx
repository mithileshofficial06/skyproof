"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARC_EXPLORER, buildTimeline, type FlightFile, sampleAt, sceneAt, ZG_EXPLORER } from "@/lib/flight";
import { buildBeats, type Beat } from "@/lib/beats";
import { deriveFx } from "@/lib/fx";
import { EventFeed } from "./EventFeed";
import { Badge, cx, HashLink, Panel, Stat } from "./ui";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => <div className="grid h-full place-items-center bg-[#dfe7ec] text-sm text-[#55595f]">Loading the city…</div> });

const SPEEDS = [1, 2, 4];
const MARK: Record<string, string> = { ok: "bg-[#0f766e]", deny: "bg-[#b91c1c]", warn: "bg-[#b45309]", info: "bg-[#94a3b8]", breach: "bg-[#b91c1c]" };

export default function FlightReplay({ flight, autoplay = true, compact = false }: { flight: FlightFile; autoplay?: boolean; compact?: boolean }) {
  const tl = useMemo(() => buildTimeline(flight), [flight]);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(compact ? 2 : 1);
  const [follow, setFollow] = useState(true);
  const last = useRef<number | null>(null);
  const beats = useMemo(() => buildBeats(tl), [tl]);
  const [beat, setBeat] = useState<Beat | null>(null);
  const shown = useRef<Set<number>>(new Set());
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endBeat = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setBeat(null);
    setPlaying(true);
  }, []);
  // Before each incident: pause, fly the camera to it, explain what is about to happen.
  useEffect(() => {
    if (!playing || beat) return;
    const b = beats.find((x, i) => x.t <= t && t - x.t < 1.5 && !shown.current.has(i));
    if (!b) return;
    shown.current.add(beats.indexOf(b));
    setBeat(b);
    setPlaying(false);
    resumeTimer.current = setTimeout(() => {
      setBeat(null);
      setPlaying(true);
    }, compact ? 3200 : 4500);
  }, [t, playing, beat, beats, compact]);
  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

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

  const seek = useCallback(
    (x: number) => {
      const n = Math.max(0, Math.min(tl.duration, x));
      beats.forEach((b, i) => {
        if (b.t > n) shown.current.delete(i);
      });
      setT(n);
    },
    [tl.duration, beats],
  );
  const s = sampleAt(tl.samples, t);
  const scene = sceneAt(tl.scenes, t);
  // trail only changes when a new 2 Hz sample is passed (no per-frame geometry rebuilds)
  const nSamples = useMemo(() => tl.samples.filter((x) => x.t <= t).length, [tl.samples, t]);
  const trail = useMemo(() => tl.samples.slice(0, nSamples).map((x) => ({ pos: x.pos, alt: x.alt })), [tl.samples, nSamples]);
  const fx = useMemo(() => deriveFx(tl.events, t, (tt) => sampleAt(tl.samples, tt), s.windMs > tl.permit.maxWindMs), [tl, t, s.windMs]);
  const status = fx.label?.tone ?? "info";
  const log = tl.events.filter((e) => e.t <= t && e.kind !== "scene").slice(-4);
  const speedNow = Math.hypot(s.vel[0], s.vel[1]);

  const scenePane = (
    <div className={cx("relative overflow-hidden rounded-lg border border-[#d9d3c6] bg-[#dfe7ec]", compact ? "h-full" : "h-[62vh] min-h-[460px]")}>
      <Scene3D permit={tl.permit} drone={{ pos: s.pos, alt: s.alt, vel: s.vel, status }} trail={trail} people={scene.people} props={scene.props} fx={beat ? { ...fx, label: undefined } : fx} follow={follow} compact={compact} focus={beat?.focus ?? null} />
      {beat && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto w-[min(520px,90%)] rounded-lg border border-[#d9d3c6] bg-[#fffdf8] p-4 shadow-[0_10px_30px_rgba(20,22,26,0.18)]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#c2410c]">Coming up · t+{beat.at.toFixed(1)}s</span>
            {!compact && (
              <button onClick={endBeat} className="rounded border border-[#e3ded3] px-2 py-0.5 text-[11px] text-[#33363b] hover:bg-[#f6f3ec]">
                Continue
              </button>
            )}
          </div>
          <div className="mt-1.5 text-lg font-semibold text-[#15171a]">{beat.title}</div>
          <p className="mt-1 text-sm leading-relaxed text-[#45484e]">{beat.text}</p>
          <div className="mt-3 h-0.5 overflow-hidden rounded bg-[#ece7dc]">
            <div className="h-full bg-[#c2410c]" style={{ animation: `beatbar ${compact ? 3.2 : 4.5}s linear forwards` }} />
          </div>
        </div>
      )}
      {!compact && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex gap-px overflow-hidden rounded-md border border-[#d9d3c6] bg-[#fffdf8]/95 text-[#15171a]">
            {[
              ["ALT", `${s.alt.toFixed(2)} m`, s.alt > tl.permit.altCeilingM],
              ["SPEED", `${speedNow.toFixed(2)} m/s`, false],
              ["BATTERY", `${Math.round(s.battery * 100)}%`, s.battery < tl.permit.minBatteryReserve + 0.2],
              ["WIND", `${s.windMs.toFixed(0)} m/s`, s.windMs > tl.permit.maxWindMs],
            ].map(([k, val, bad]) => (
              <div key={k as string} className="px-3 py-1.5">
                <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#8a8d93]">{k}</div>
                <div className={cx("font-mono text-sm tabular-nums", bad ? "text-[#b91c1c]" : "text-[#15171a]")}>{val}</div>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 w-72 rounded-md border border-[#d9d3c6] bg-[#fffdf8]/95 p-2.5">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8d93]">Mission log</div>
            {log.map((e) => (
              <div key={`${e.seq}-${e.kind}`} className="flex items-center gap-2 py-0.5 text-[12px]">
                <span className={cx("h-2 w-2 shrink-0 rounded-sm", MARK[e.status])} />
                <span className="w-11 shrink-0 font-mono text-[10px] text-[#8a8d93]">{e.t.toFixed(1)}s</span>
                <span className="truncate text-[#15171a]">{e.title}</span>
              </div>
            ))}
          </div>
          <div className="absolute right-3 top-3 flex overflow-hidden rounded-md border border-[#d9d3c6] bg-[#fffdf8] text-xs">
            {[
              [true, "Follow drone"],
              [false, "Overview"],
            ].map(([f, l]) => (
              <button key={l as string} onClick={() => setFollow(f as boolean)} className={cx("px-3 py-1.5", follow === f ? "bg-[#15171a] text-[#f4f1ea]" : "text-[#33363b] hover:bg-[#f6f3ec]")}>
                {l}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
  if (compact) return scenePane;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        {scenePane}
        <div className="flex items-center gap-3 rounded-lg border border-[#e3ded3] bg-[#fffdf8] p-3">
          <button onClick={() => (t >= tl.duration ? (setT(0), setPlaying(true)) : setPlaying((p) => !p))} className="grid h-9 w-9 place-items-center rounded-md bg-[#15171a] text-[#f4f1ea] hover:bg-[#2b2e33]" aria-label={playing ? "pause" : "play"}>
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M7 4.5v15l12-7.5z" /></svg>
            )}
          </button>
          <div className="relative h-8 flex-1">
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-[#e6e1d6]" />
            <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded bg-[#15171a]" style={{ width: `${(t / tl.duration) * 100}%` }} />
            {tl.events
              .filter((e) => e.kind === "decision" || e.kind === "situation" || e.status === "breach" || e.kind === "safe_stop")
              .map((e) => (
                <button key={`${e.seq}-${e.kind}`} title={e.title} onClick={() => seek(e.t)} className={cx("absolute top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2", MARK[e.status])} style={{ left: `${(e.t / tl.duration) * 100}%` }} />
              ))}
            {beats.map((b) => (
              <span key={b.at} title={b.title} className="pointer-events-none absolute -top-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#c2410c]" style={{ left: `${(b.at / tl.duration) * 100}%` }} />
            ))}
            <input type="range" min={0} max={tl.duration} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="timeline" />
          </div>
          <span className="w-24 text-right font-mono text-xs tabular-nums text-[#55595f]">
            {t.toFixed(1)} / {tl.duration.toFixed(0)} s
          </span>
          <div className="flex overflow-hidden rounded-md border border-[#e3ded3]">
            {SPEEDS.map((x) => (
              <button key={x} onClick={() => setSpeed(x)} className={cx("px-2 py-1 font-mono text-xs", speed === x ? "bg-[#15171a] text-[#f4f1ea]" : "text-[#55595f] hover:bg-[#f6f3ec]")}>
                {x}×
              </button>
            ))}
          </div>
        </div>
        <ProofPanels flight={flight} />
      </div>
      <Panel title="Everything the drone did" right={<span className="font-mono text-[11px] text-[#8a8d93]">{tl.events.filter((e) => e.t <= t).length}/{tl.events.length}</span>} className="xl:sticky xl:top-20 xl:self-start">
        <div className="-m-4 max-h-[70vh] overflow-y-auto xl:max-h-[calc(100vh-10rem)]">
          <EventFeed events={tl.events} now={tl.events.filter((e) => e.t <= t).at(-1)?.t ?? -1} onSeek={seek} />
        </div>
      </Panel>
    </div>
  );
}

function ProofPanels({ flight }: { flight: FlightFile }) {
  const r = flight.report;
  const zg = r.decisions.filter((d) => d.source.startsWith("0G")).length;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="0G · decisions and black box">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="0G decisions" value={zg} sub={`of ${r.decisions.length} checks`} />
          <Stat label="Record" value={r.ok ? "Intact" : "Broken"} tone={r.ok ? "good" : "bad"} sub={`${r.records} signed records`} />
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          <Row k="Flight on 0G Chain"><HashLink hash={flight.chain.chainFlightId} href={flight.chain.openTx ? `${ZG_EXPLORER}/tx/${flight.chain.openTx}` : undefined} /></Row>
          <Row k="Operator (signer)"><HashLink hash={flight.chain.operator} href={`${ZG_EXPLORER}/address/${flight.chain.operator}`} /></Row>
          {flight.segments.map((s) => (
            <Row key={s.index} k={`Storage segment ${s.index} (#${s.fromSeq}–${s.toSeq})`}>
              <HashLink hash={s.rootHash} href={`${ZG_EXPLORER}/tx/${s.storageTx}`} />
            </Row>
          ))}
          {flight.segments.map((s) => (
            <Row key={`a${s.index}`} k={`Anchor ${s.index}`}>
              <HashLink hash={s.anchorTx} href={`${ZG_EXPLORER}/tx/${s.anchorTx}`} />
            </Row>
          ))}
        </div>
      </Panel>
      <Panel title="Chainlink · the judge's rules">
        <div className={cx("rounded-md border px-3 py-2.5", r.verdict === "BREACH" ? "border-[#f0c4c4] bg-[#fdf0f0]" : "border-[#b7dcd6] bg-[#ecf7f5]")}>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#8a8d93]">Verdict</div>
          <div className={cx("text-xl font-semibold", r.verdict === "BREACH" ? "text-[#9b1c1c]" : "text-[#0f5f59]")}>{r.verdict}</div>
          <div className="text-xs text-[#55595f]">{r.verdict === "BREACH" ? "Objective rule broken: the victim is paid automatically" : "No rule broken: held for the insurer"}</div>
        </div>
        <ul className="mt-3 divide-y divide-[#ece7dc] text-xs">
          {[
            ["B1", "Left the area or entered no-fly", "B1_GEOFENCE"],
            ["B2", "Above the altitude ceiling", "B2_ALTITUDE"],
            ["B3", "Acted without a 0G approval", "B3_UNAPPROVED_ACTION"],
            ["B4", "Override after a DENY", "B4_OVERRIDE_ON_DENY"],
            ["B5", "Record broken or unanchored", "B5_RECORD_BROKEN"],
            ["B6", "Take-off in unsafe wind", "B6_UNSAFE_WIND_LAUNCH"],
          ].map(([k, label, code]) => {
            const n = r.breaches.filter((b) => b.code === code).length;
            return (
              <li key={k} className="flex items-center justify-between py-1.5">
                <span className="text-[#33363b]">
                  <span className="mr-2 font-mono text-[#8a8d93]">{k}</span>
                  {label}
                </span>
                {n ? <Badge tone="deny">broken ×{n}</Badge> : <span className="text-[#0f766e]">✓</span>}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Arc · bond and payout">
        {flight.claims.length === 0 ? (
          <p className="text-sm text-[#55595f]">No claim was filed for this flight. The operator&apos;s USDC bond stays locked in the Arc escrow.</p>
        ) : (
          flight.claims.map((c) => (
            <div key={c.claimId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#15171a]">Claim #{c.claimId}</span>
                <Badge tone={c.state === "Paid" ? "ok" : c.state === "Held" ? "warn" : "mute"}>{c.state}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Verdict" value={c.verdict} tone={c.verdict === "BREACH" ? "bad" : "warn"} />
                <Stat label="Payout cap" value={c.cap.replace(" USDC", "")} sub="USDC" />
              </div>
              <div className="space-y-1.5 text-xs">
                <Row k="Escrow"><HashLink hash={flight.arc.escrow} href={`${ARC_EXPLORER}/address/${flight.arc.escrow}`} /></Row>
                <Row k="Victim"><HashLink hash={c.victim} href={`${ARC_EXPLORER}/address/${c.victim}`} /></Row>
                {c.breachCode && <Row k="Breach code"><span className="font-mono text-[#9b1c1c]">{c.breachCode}</span></Row>}
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
      <span className="text-[#6b6f76]">{k}</span>
      {children}
    </div>
  );
}
