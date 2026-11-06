"use client";
// /experience: the "Two Truths" scroll story (specs/05-uiux.md). DOM sections scroll over a fixed 3D canvas;
// both read the same store.
import { useEffect } from "react";
import { ModeBadge } from "@/components/experience/ModeBadge";
import { ScrollProvider } from "@/components/experience/ScrollProvider";
import { Stage3D } from "@/components/experience/Stage3D";
import { StationInfo } from "@/components/experience/StationInfo";
import { TamperPanel } from "@/components/experience/TamperPanel";
import { VerifyPanel } from "@/components/experience/VerifyPanel";
import { source } from "@/lib/data/adapter";
import { useUI } from "@/lib/store";
import { X } from "@/lib/tokens";

const SECTIONS = [
  { id: "problem", kicker: "The problem", title: "Today, the operator holds the only record.", body: "After a drone accident, the flight log lives on the operator's own devices and servers. Investigators, insurers and victims can only take their word for it." },
  { id: "two-truths", kicker: "Two truths", title: "What someone claims, and what was recorded.", body: "Every flight has a claimed timeline and a sealed one. Change a single number in the claim and every later fingerprint breaks." },
  { id: "zerog", kicker: "Decided and recorded on 0G", title: "The drone asks before it acts. The answer is sealed.", body: "A vision model on 0G approves each move, and every record is chained, encrypted and anchored on 0G mid-flight." },
  { id: "chainlink", kicker: "Judged by Chainlink", title: "A judge nobody controls.", body: "A Chainlink workflow rebuilds the flight from 0G, checks every fingerprint against 0G Chain and applies six objective rules." },
  { id: "arc", kicker: "Settled on Arc", title: "A proven breach pays the victim.", body: "The operator's USDC bond on Arc pays out automatically on a BREACH verdict. A broken or missing record is itself a breach (rule B5)." },
  { id: "verify", kicker: "Verify", title: "Don't trust us. Check a record yourself.", body: "Load a sealed flight, recompute every fingerprint in your browser and compare it with 0G Chain." },
];

export default function Experience() {
  // the sealed flight Two Truths draws, through the data adapter only (CLAUDE.md UI rules)
  useEffect(() => {
    let live = true;
    source
      .load()
      .then((f) => {
        if (!live) return;
        const st = useUI.getState();
        st.setFlight(f);
        st.setMode(f.source);
        // ?tamper=<record> replays an edit on a local copy (screenshots / demos); the badge says SANDBOX
        const t = Number(new URLSearchParams(window.location.search).get("tamper"));
        if (Number.isInteger(t) && t > 0 && t < f.blocks.length) {
          st.setMode("sandbox");
          setTimeout(() => useUI.getState().startTamper(t, 0.6), 600);
        }
      })
      .catch(() => useUI.getState().setFlight(null));
    return () => {
      live = false;
    };
  }, []);

  // keyboard: T jumps to the tamper playground
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "t" || /input|select|textarea/i.test((e.target as HTMLElement).tagName)) return;
      document.getElementById("two-truths")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  // the whole page sits on the near-black stage
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = X.bg;
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  return (
    <ScrollProvider>
      <Stage3D />
      <ModeBadge />
      <div className="relative z-10 text-x-text">
        <section className="flex min-h-[92vh] flex-col justify-end pb-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-x-cyan">Independent · tamper-evident</p>
          <h1 className="mt-5 max-w-4xl text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">The black box drones can&apos;t lie to.</h1>
          <p className="mt-6 max-w-xl text-base leading-[1.6] text-x-muted">Independent. Tamper-evident. Every decision recorded on 0G, judged by Chainlink, settled on Arc.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#problem" className="rounded-full bg-x-cyan px-5 py-2.5 text-sm font-semibold text-x-bg transition-[filter] duration-150 hover:brightness-110">
              Watch a flight
            </a>
            <a href="#two-truths" className="rounded-full border border-x-border px-5 py-2.5 text-sm font-semibold text-x-text transition-colors duration-150 hover:border-x-cyan/60">
              Try to tamper
            </a>
          </div>
        </section>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="flex min-h-screen scroll-mt-20 items-center">
            <div className="max-w-md rounded-xl border border-x-border bg-x-surface/80 p-7 backdrop-blur">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-x-cyan">{s.kicker}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-x-muted">{s.body}</p>
              {s.id === "two-truths" && (
                <>
                  <TruthsLegend />
                  <TamperPanel />
                </>
              )}
              {s.id === "problem" && <ProblemFacts />}
              {(s.id === "zerog" || s.id === "chainlink" || s.id === "arc") && <StationInfo id={s.id} />}
              {s.id === "verify" && <VerifyPanel />}
            </div>
          </section>
        ))}
      </div>
    </ScrollProvider>
  );
}

function TruthsLegend() {
  const flight = useUI((s) => s.flight);
  if (!flight) return <p className="mt-4 font-mono text-[11px] text-x-muted">Loading a sealed flight…</p>;
  return (
    <div className="mt-5 space-y-2 border-t border-x-border pt-4 font-mono text-[11px]">
      <div className="flex items-center gap-2 text-x-text">
        <span className="h-[3px] w-6 rounded-full bg-x-cyan" /> Recorded: sealed on 0G
      </div>
      <div className="flex items-center gap-2 text-x-muted">
        <span className="h-[3px] w-6 rounded-full bg-x-ghost" /> Claimed: a copy someone hands over
      </div>
      <p className="pt-1 text-x-muted">
        {flight.id} · {flight.blocks.length} records · {flight.anchors.length} anchors ({flight.anchorsFrom === "0g-chain" ? "read from 0G Chain" : "replay"})
      </p>
    </div>
  );
}

// Problem section: two documented cases (sources from docs/Deep_Research_2026-11-05.md)
function ProblemFacts() {
  return (
    <ul className="mt-5 space-y-3 border-t border-x-border pt-4 text-[13px] leading-relaxed text-x-muted">
      <li>
        <span className="text-x-text">Barcarès, France · 3 injured.</span> The investigator could not check the operator&apos;s story: the flight logs were gone from the drone, the tablet and the phone.{" "}
        <a href="https://bea.aero/fileadmin/user_upload/BEA2019-0416_1.pdf" target="_blank" rel="noreferrer" className="font-mono text-[11px] text-x-cyan underline underline-offset-2">BEA ↗</a>
      </li>
      <li>
        <span className="text-x-text">Tolleson, USA · 2 drones hit a crane.</span> Flights resumed in about 48 hours on the operator&apos;s own review of its own telemetry.{" "}
        <a href="https://www.cnbc.com/2025/10/02/amazon-drone-crash-faa-ntsb.html" target="_blank" rel="noreferrer" className="font-mono text-[11px] text-x-cyan underline underline-offset-2">CNBC ↗</a>
      </li>
    </ul>
  );
}
