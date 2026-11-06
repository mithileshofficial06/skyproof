"use client";
// /experience: the "Two Truths" scroll story (specs/05-uiux.md). DOM sections scroll over a fixed 3D canvas;
// both read the same store. Sections are placeholders until their tasks (UI-3..UI-9) land.
import { useEffect } from "react";
import { ModeBadge } from "@/components/experience/ModeBadge";
import { ScrollProvider } from "@/components/experience/ScrollProvider";
import { Stage3D } from "@/components/experience/Stage3D";
import { X } from "@/lib/tokens";

const SECTIONS = [
  { id: "problem", kicker: "The problem", title: "Today, the operator holds the only record.", body: "After a drone accident, the flight log lives on the operator's own devices and servers. Investigators, insurers and victims can only take their word for it." },
  { id: "two-truths", kicker: "Two truths", title: "What someone claims, and what was recorded.", body: "Every flight has a claimed timeline and a sealed one. Change a single number in the claim and every later fingerprint breaks." },
  { id: "zerog", kicker: "Decided and recorded on 0G", title: "The drone asks before it acts. The answer is sealed.", body: "A vision model on 0G approves each move, and every record is chained, encrypted and anchored on 0G mid-flight." },
  { id: "chainlink", kicker: "Judged by Chainlink", title: "A judge nobody controls.", body: "A Chainlink workflow rebuilds the flight from 0G, checks every fingerprint against 0G Chain and applies six objective rules." },
  { id: "arc", kicker: "Settled on Arc", title: "A proven breach pays the victim.", body: "The operator's USDC bond on Arc pays out automatically on a BREACH verdict. A broken record means no payout." },
  { id: "verify", kicker: "Verify", title: "Don't trust us. Check a record yourself.", body: "Load a sealed flight, recompute every fingerprint in your browser and compare it with 0G Chain." },
];

export default function Experience() {
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
            </div>
          </section>
        ))}
      </div>
    </ScrollProvider>
  );
}
