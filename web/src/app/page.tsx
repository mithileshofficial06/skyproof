"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import escrowAbi from "@/lib/escrowAbi.json";
import FlightReplay from "@/components/FlightReplay";
import { HeroAnimation } from "@/components/HeroAnimation";
import ProofCheck from "@/components/ProofCheck";
import { Problem } from "@/components/home/Problem";
import { Sponsors } from "@/components/home/Sponsors";
import { Story } from "@/components/home/Story";
import { WithWithout } from "@/components/home/WithWithout";
import { CountUp, Reveal } from "@/components/motion";
import { type ClaimView, ESCROW, pub } from "@/lib/arc";
import { pickFlight, useFlight, useIndex } from "@/lib/data";

const SITUATIONS = [
  { t: "A crane on the route", o: ["CLIMB", "LEFT", "RIGHT", "WAIT", "RETURN"], note: "the reflex brakes first" },
  { t: "People under the flight path", o: ["CLIMB_OVER", "SHIFT_LEFT", "SHIFT_RIGHT", "WAIT"], note: "illegal options are vetoed" },
  { t: "Choosing the drop spot", o: ["A", "B", "C", "NONE"], note: "with a fake “safe” sign" },
  { t: "Drop zone blocked", o: ["WAIT_MORE", "BACKUP_ZONE", "RETURN"], note: "the package still arrives" },
  { t: "Gust and battery fault", o: ["CONTINUE", "HOLD", "LAND_NEAREST"], note: "CONTINUE vetoed on battery" },
  { t: "0G unreachable", o: ["HOLD", "DIVERT", "LAND"], note: "safe stop, never a fake decision" },
];

export default function Home() {
  const { data: index } = useIndex();
  const pick = index ? pickFlight(index, "full") : null;
  const breach = index ? pickFlight(index, "geofence_breach") : null;
  const { data: flight } = useFlight(pick?.flightId ?? null);
  const { data: cheatFlight } = useFlight(breach?.flightId ?? null);
  const paid = usePaidOnArc();
  const stats = index && {
    flights: index.length,
    records: index.reduce((a, f) => a + f.records, 0),
    decisions: index.reduce((a, f) => a + f.zgDecisions, 0),
    intact: index.filter((f) => f.intact).length,
  };

  return (
    <div className="space-y-32">
      {/* hero: the cockpit */}
      <section className="cockpit relative left-1/2 -mt-20 w-screen -translate-x-1/2 overflow-hidden bg-[#0b1017] pb-20 pt-32">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden>
          <defs>
            <pattern id="hg" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M36 0H0V36" fill="none" stroke="#4b6178" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hg)" />
        </svg>
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#7c5cff]/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-48 left-10 h-[420px] w-[420px] rounded-full bg-[#22d3ee]/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="rise">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#22d3ee]">
              <span className="blink h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
              ETHGlobal Mumbai 2026 · 0G Physical AI
            </p>
            <h1 className="mt-5 text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] text-white md:text-[62px]">
              An independent black box for <span className="bg-gradient-to-r from-[#b4a2ff] via-[#8ea5f0] to-[#67d4e2] bg-clip-text text-transparent">autonomous drones.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#b3bfcc]">
              When a drone hurts someone, the only record of what it saw and decided belongs to the operator. SkyProof moves those decisions onto 0G, seals the record where nobody can edit it, and pays the victim automatically when the record shows a rule was broken.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/live" className="rounded-md bg-[#22d3ee] px-5 py-3 text-sm font-semibold text-[#061018] shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:bg-[#67e8f9]">
                Watch it fly live
              </Link>
              <Link href={pick ? `/flights/${pick.flightId}` : "/flights"} className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Replay a sealed flight
              </Link>
              <a href="#problem" className="px-3 py-3 text-sm font-semibold text-[#94a3b3] hover:text-white">
                Why it matters ↓
              </a>
            </div>
            {stats && (
              <dl className="mt-12 grid max-w-xl grid-cols-2 gap-y-6 border-t border-white/10 pt-6 sm:grid-cols-4">
                {[
                  [stats.flights, "flights sealed on 0G", "#b4a2ff"],
                  [stats.records, "records sealed", "#b4a2ff"],
                  [stats.decisions, "decisions by 0G", "#b4a2ff"],
                  [paid, "USDC paid on Arc by verdict", "#67d4e2"],
                ].map(([n, l, c]) => (
                  <div key={l as string}>
                    <dt className="font-mono text-3xl font-semibold" style={{ color: c as string }}>
                      {n === null ? "…" : <CountUp to={n as number} />}
                    </dt>
                    <dd className="mt-1 text-[11px] leading-tight text-[#6c7c8d]">{l}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="rise relative" style={{ animationDelay: "0.15s" }}>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-[#ebe6db] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              <HeroAnimation />
            </div>
            {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
              <span key={c} className={`pointer-events-none absolute -m-2 h-5 w-5 border-[#22d3ee] ${c}`} />
            ))}
            {stats && (
              <div className="absolute -bottom-5 left-6 rounded-md border border-white/15 bg-[#101822] px-3 py-1.5 font-mono text-[11px] text-[#5eead4]">
                {stats.intact}/{stats.flights} records intact on 0G Chain ✓
              </div>
            )}
          </div>
        </div>
      </section>

      <Problem />

      <Story />

      <WithWithout />

      <Sponsors />

      {/* try to cheat */}
      <section>
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">Don&apos;t trust us</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">Try to cheat. Your browser checks the record against 0G Chain.</h2>
          <p className="mt-3 max-w-2xl text-[15px] text-[#55595f]">This is the flight where the operator disabled the safety gate. Forge a 0G approval, fake the GPS or delete a record, and watch the chain break.</p>
        </Reveal>
        <div className="mt-8">{cheatFlight ? <ProofCheck flight={cheatFlight} /> : <div className="h-40 rounded-lg border border-[#e3ded3]" />}</div>
      </section>

      {/* real flight */}
      <section>
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">A real flight</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">Rebuilt from 0G Storage and replayed in the city.</h2>
        </Reveal>
        <div className="mt-10 h-[520px]">
          {flight ? <FlightReplay flight={flight} compact /> : <div className="grid h-full place-items-center rounded-lg border border-[#e3ded3] text-sm text-[#8a8d93]">Loading a sealed flight…</div>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#55595f]">
          <span>Crowd, crane, fake sign, gust and battery fault, all decided by 0G.</span>
          {pick && (
            <Link href={`/flights/${pick.flightId}`} className="font-semibold text-[#15171a] underline decoration-[#7c5cff] decoration-2 underline-offset-4">
              Open the full replay with every decision →
            </Link>
          )}
        </div>
      </section>

      {/* situations */}
      <section>
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">What 0G decides</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">Not just yes or no. When something happens in flight, 0G chooses what the drone does.</h2>
        </Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#e3ded3] bg-[#e3ded3] sm:grid-cols-2 lg:grid-cols-3">
          {SITUATIONS.map((s, i) => (
            <Reveal key={s.t} delay={i * 70} className="bg-[#fffdf8] p-5">
              <h3 className="font-semibold text-[#15171a]">{s.t}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.o.map((o) => (
                  <span key={o} className="rounded border border-[#c7c2ef] bg-[#f1effd] px-1.5 py-0.5 font-mono text-[11px] text-[#3b2fa8]">
                    {o}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#8a8d93]">{s.note}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="cockpit relative overflow-hidden rounded-xl bg-[#0b1017] px-8 py-14 md:px-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#7c5cff]/25 blur-[90px]" />
          <h2 className="relative max-w-2xl text-3xl font-semibold tracking-tight text-white">A drone that cannot act without a recorded decision can&apos;t hide one.</h2>
          <p className="relative mt-4 max-w-2xl text-[#94a3b3]">Missing records prove tampering. Every flight here was rebuilt from 0G and checked fingerprint by fingerprint.</p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link href="/flights" className="rounded-md bg-[#22d3ee] px-5 py-3 text-sm font-semibold text-[#061018]">
              Browse sealed flights
            </Link>
            <Link href="/claim" className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              File a claim on Arc
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

/** Total USDC paid to victims by automatic BREACH verdicts, read from the escrow on Arc. */
function usePaidOnArc() {
  const [paid, setPaid] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      const next = Number(await pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "nextClaimId" }));
      const cs = await Promise.all(Array.from({ length: next - 1 }, (_, i) => pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "claims", args: [BigInt(i + 1)] }) as Promise<ClaimView>));
      setPaid(cs.filter((c) => c.state === 3).reduce((a, c) => a + Number(c.cap) / 1e6, 0));
    })().catch(() => setPaid(null));
  }, []);
  return paid;
}
