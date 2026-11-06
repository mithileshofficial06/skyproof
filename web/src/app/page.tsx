"use client";
// Home, in the ozky layout: Lander (title + a real sealed flight replaying in 3D + system status), the people
// SkyProof serves, the real problem, how each sponsor network proves a step, a live check against 0G Chain, CTA.
import FlightReplay from "@/components/FlightReplay";
import { Problem } from "@/components/home/Problem";
import { Lander } from "@/components/oz/Lander";
import { RuneGlitch } from "@/components/oz/RuneGlitch";
import { Cta, Insights, Roles } from "@/components/oz/Sections";
import ProofCheck from "@/components/ProofCheck";
import { pickFlight, useFlight, useIndex } from "@/lib/data";

export default function Home() {
  const { data: index } = useIndex();
  const pick = index ? pickFlight(index, "full") : null;
  const breach = index ? pickFlight(index, "geofence_breach") : null;
  const { data: flight } = useFlight(pick?.flightId ?? null);
  const { data: cheatFlight } = useFlight(breach?.flightId ?? null);
  const stats = index && {
    flights: index.length,
    records: index.reduce((a, f) => a + f.records, 0),
    decisions: index.reduce((a, f) => a + f.zgDecisions, 0),
  };

  return (
    <div>
      <Lander
        band={
          flight ? (
            <div className="relative h-full">
              <FlightReplay flight={flight} compact />
            </div>
          ) : (
            <div className="relative grid h-full place-items-center">
              <RuneGlitch fill cell={34} gap={14} runeSize={20} />
              <span className="mono relative text-[11px] text-gold">Loading a sealed flight from 0G…</span>
            </div>
          )
        }
      />

      {stats && (
        <section className="grid grid-cols-3 border-y border-ink bg-grey text-ink" aria-label="Live totals">
          {[
            ["flights sealed on 0G", stats.flights],
            ["records sealed", stats.records],
            ["decisions by 0G", stats.decisions],
          ].map(([l, v], i) => (
            <div key={String(l)} className={`px-5 py-8 sm:px-8 ${i ? "border-l border-ink" : ""}`}>
              <div className="font-display text-[clamp(2rem,5vw,4.5rem)] font-semibold leading-none tracking-[-0.04em]">{Number(v).toLocaleString()}</div>
              <div className="mono mt-2 text-[10px]">{l}</div>
            </div>
          ))}
        </section>
      )}

      <Roles />

      <section className="border-t border-ink bg-grey px-5 py-20 sm:px-8">
        <p className="mono mb-8 text-[10px]">01 · The problem is real</p>
        <Problem />
      </section>

      <Insights
        visual={
          <div className="relative h-full">
            <RuneGlitch fill cell={30} gap={12} runeSize={18} />
          </div>
        }
      />

      <section id="check" className="scroll-mt-24 border-t border-ink bg-grey px-5 py-20 sm:px-8">
        <p className="mono text-[10px]">02 · Don&apos;t trust us</p>
        <h2 className="mt-4 max-w-4xl font-display text-[clamp(2rem,4.4vw,4rem)] font-medium leading-[0.98] tracking-[-0.03em]">Try to cheat. Your browser checks the record against 0G Chain.</h2>
        <p className="mono mt-5 max-w-[60ch] text-[11px] leading-[1.8]">This is the flight where the operator disabled the safety gate. Forge a 0G approval, fake the GPS or delete a record, and watch the chain break.</p>
        <div className="mt-10">{cheatFlight ? <ProofCheck flight={cheatFlight} /> : <div className="h-40 border border-ink" />}</div>
      </section>

      <Cta />
    </div>
  );
}
