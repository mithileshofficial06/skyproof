"use client";
import Link from "next/link";
import FlightReplay from "@/components/FlightReplay";
import { Badge, Panel } from "@/components/ui";
import { pickFlight, useFlight, useIndex } from "@/lib/data";

const PILLARS = [
  { k: "01", tone: "from-violet-500/30", title: "0G decides", body: "Before every drop, landing or reroute, and whenever something happens in flight, a vision model on 0G Private Computer looks through the drone's camera and decides. No 0G answer, no move.", tag: "0G Private Computer" },
  { k: "02", tone: "from-fuchsia-500/25", title: "0G records", body: "Every decision, position and action is hash-chained, signed, encrypted and sealed on 0G Storage while the drone flies, with fingerprints anchored on 0G Chain. Edit one record and it breaks.", tag: "0G Storage + Chain" },
  { k: "03", tone: "from-blue-500/30", title: "Chainlink judges", body: "When a victim files a claim, a Chainlink CRE workflow rebuilds the flight from 0G, checks it against the on-chain anchors and applies six objective rules. Nobody judges their own case.", tag: "Chainlink CRE" },
  { k: "04", tone: "from-cyan-500/30", title: "Arc pays", body: "The operator's USDC bond is locked in an Arc escrow. A BREACH verdict pays the victim automatically. Everything else is held for the insurer, with verified evidence.", tag: "Arc · USDC" },
];

const PROBLEM = [
  ["Barcarès, France", "3 people injured. The investigator could not verify the operator's story because the logs were gone from the drone, the tablet and the phone.", "BEA2019-0416"],
  ["Orlando, USA, Dec 2024", "Show drones fell into a crowd and a 7-year-old needed open-heart surgery. The lawsuit has four defendants arguing over data they hold.", "NTSB · court filing"],
  ["Amazon MK30, 2024-26", "Drones hit a crane, a cable and a building. After Tolleson, flights resumed in about 48 h on Amazon's own review of its own telemetry.", "FAA · NTSB · AAIB"],
];

const SITUATIONS = [
  ["Crane on the route", "CLIMB · LEFT · RIGHT · WAIT · RETURN"],
  ["People under the path", "CLIMB_OVER · SHIFT · WAIT"],
  ["Choose the drop spot", "A · B · C · NONE"],
  ["Fake “SAFE TO DROP” sign", "image text is data, never instructions"],
  ["Drop zone blocked", "WAIT · BACKUP ZONE · RETURN"],
  ["Gust + battery fault", "CONTINUE · HOLD · LAND NEAREST"],
];

export default function Home() {
  const { data: index } = useIndex();
  const pick = index ? pickFlight(index, "full") : null;
  const { data: flight } = useFlight(pick?.flightId ?? null);
  const stats = index && {
    flights: index.length,
    decisions: index.reduce((a, f) => a + f.zgDecisions, 0),
    breaches: index.filter((f) => f.verdict === "BREACH").length,
    intact: index.filter((f) => f.intact).length,
  };

  return (
    <div className="space-y-20">
      <section className="relative grid items-center gap-10 pt-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" />
        <div>
          <Badge tone="zg">ETHGlobal Mumbai 2026 · 0G Physical AI</Badge>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            An independent <span className="text-gradient">black box</span> for autonomous drones.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            When a drone hurts someone, the only record belongs to the operator. SkyProof makes every decision on 0G, seals the record where nobody can edit it, and pays victims automatically when the record shows a rule was broken.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-violet-300">0G decides and records.</span>
            <span className="font-semibold text-blue-300">Chainlink judges.</span>
            <span className="font-semibold text-cyan-300">Arc pays.</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={pick ? `/flights/${pick.flightId}` : "/flights"} className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
              Watch a sealed flight
            </Link>
            <Link href="/live" className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10">
              Live mission console
            </Link>
          </div>
          {stats && (
            <div className="mt-10 grid max-w-xl grid-cols-4 gap-3">
              {[
                [stats.flights, "flights sealed on 0G"],
                [stats.decisions, "0G decisions"],
                [`${stats.intact}/${stats.flights}`, "records intact"],
                [stats.breaches, "breaches caught"],
              ].map(([n, l]) => (
                <div key={l as string}>
                  <div className="font-mono text-2xl font-semibold text-white">{n}</div>
                  <div className="text-[11px] leading-tight text-slate-500">{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative h-[460px] lg:h-[540px]">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-transparent blur-2xl" />
          {flight ? <FlightReplay flight={flight} compact /> : <div className="grid h-full place-items-center rounded-2xl border border-white/10 text-sm text-slate-500">Loading a flight sealed on 0G…</div>}
          {flight && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
              Replayed from 0G Storage · {flight.report.decisions.length} decisions · record {flight.report.ok ? "intact ✓" : "broken ✕"}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">The problem is real</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PROBLEM.map(([t, b, s]) => (
            <Panel key={t} className="h-full">
              <div className="text-base font-semibold text-white">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{b}</p>
              <div className="mt-3 font-mono text-[11px] text-slate-500">{s}</div>
            </Panel>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">No rule anywhere requires drone logs to be tamper-evident or held independently. India mandated tamper-proof logging in 2021, then deferred it.</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">How SkyProof works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.k} className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${p.tone} to-transparent p-5`}>
              <div className="font-mono text-xs text-slate-400">{p.k}</div>
              <div className="mt-3 text-xl font-semibold text-white">{p.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.body}</p>
              <div className="mt-4">
                <Badge>{p.tag}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Six in-flight situations, decided by 0G">
          <div className="grid gap-2 sm:grid-cols-2">
            {SITUATIONS.map(([t, o]) => (
              <div key={t} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                <div className="text-sm font-semibold text-slate-100">{t}</div>
                <div className="mt-1 font-mono text-[11px] text-violet-300/80">{o}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">A reflex on the drone brakes instantly; 0G then picks from a fixed menu, and the permit vetoes illegal options before 0G ever sees them.</p>
        </Panel>
        <Panel title="When 0G cannot be reached">
          <p className="text-sm leading-relaxed text-slate-300">
            The drone holds, retries for 15 seconds, then flies a pre-approved safe-stop to the nearest rally point that avoids the no-fly zone and lands. Every step is recorded as <span className="font-mono text-amber-300">SAFE_STOP_LOCAL</span> with <span className="text-amber-200">“no 0G decision claimed”</span>. A decision is never faked.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {["Hold + retry", "Divert to rally", "Land + record"].map((s, i) => (
              <div key={s} className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-2 py-3 text-amber-200">
                <div className="font-mono text-[10px] text-amber-400/70">STEP {i + 1}</div>
                {s}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
