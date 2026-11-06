"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import escrowAbi from "@/lib/escrowAbi.json";
import FlightReplay from "@/components/FlightReplay";
import { Hero } from "@/components/home/Hero";
import ProofCheck from "@/components/ProofCheck";
import { Problem } from "@/components/home/Problem";
import { Sponsors } from "@/components/home/Sponsors";
import { Story } from "@/components/home/Story";
import { WithWithout } from "@/components/home/WithWithout";
import { Reveal } from "@/components/motion";
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
      <Hero
        liveHref="/live"
        replayHref={pick ? `/flights/${pick.flightId}` : "/flights"}
        stats={[
          { label: "flights sealed on 0G", value: stats ? stats.flights : null },
          { label: "records sealed", value: stats ? stats.records : null },
          { label: "decisions by 0G", value: stats ? stats.decisions : null },
          { label: "USDC paid on Arc", value: paid },
        ]}
      />

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
