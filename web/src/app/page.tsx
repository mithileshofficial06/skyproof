"use client";
import Link from "next/link";
import FlightReplay from "@/components/FlightReplay";
import { HeroAnimation } from "@/components/HeroAnimation";
import { pickFlight, useFlight, useIndex } from "@/lib/data";

const CASES = [
  { where: "Barcarès, France · 2019", fact: "3 people injured", body: "The air-accident investigator could not check the operator's “battery failure” story. The flight logs were gone from the drone, the tablet and the phone.", src: "BEA report 2019-0416" },
  { where: "Orlando, USA · Dec 2024", fact: "7-year-old in surgery", body: "Show drones fell into a crowd. The lawsuit names four defendants, arguing over flight data the defendants themselves hold.", src: "NTSB · court filing" },
  { where: "Amazon MK30 · 2024–26", fact: "crane, cable, building", body: "After two drones hit a crane in Arizona, flights resumed in about 48 hours on Amazon's own review of its own telemetry.", src: "FAA · NTSB · UK AAIB" },
];

const STEPS = [
  { n: "01", who: "Permit", title: "A signed flight permit", body: "Allowed area, no-fly zones, height ceiling, wind limit. Registered on 0G Chain before take-off." },
  { n: "02", who: "0G Private Computer", title: "0G decides every move", body: "Before a take-off, reroute, drop or landing, and whenever something happens in flight, a vision model on 0G looks through the drone's camera and decides." },
  { n: "03", who: "0G Storage + Chain", title: "The black box seals itself", body: "Every decision, position and action is signed, chained and encrypted, uploaded to 0G Storage mid-flight and fingerprinted on 0G Chain." },
  { n: "04", who: "Chainlink CRE", title: "An independent judge", body: "When someone files a claim, a Chainlink workflow rebuilds the flight from 0G, checks every fingerprint and applies six objective rules." },
  { n: "05", who: "Arc · USDC", title: "The victim is paid", body: "A breach pays the victim from the operator's locked USDC bond, automatically. Anything else is held for the insurer with verified evidence." },
];

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
  const { data: flight } = useFlight(pick?.flightId ?? null);
  const stats = index && {
    flights: index.length,
    decisions: index.reduce((a, f) => a + f.zgDecisions, 0),
    breaches: index.filter((f) => f.verdict === "BREACH").length,
    intact: index.filter((f) => f.intact).length,
  };

  return (
    <div className="space-y-28">
      {/* hero */}
      <section className="grid items-center gap-12 pt-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="rise">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">ETHGlobal Mumbai 2026 · 0G Physical AI</p>
          <h1 className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#15171a] md:text-[60px]">
            An independent black box for autonomous drones.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#45484e]">
            When a drone hurts someone, the only record of what it saw and decided belongs to the operator. SkyProof moves those decisions onto 0G, seals the record where nobody can edit it, and pays the victim automatically when the record shows a rule was broken.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={pick ? `/flights/${pick.flightId}` : "/flights"} className="rounded-md bg-[#15171a] px-5 py-3 text-sm font-semibold text-[#f4f1ea] hover:bg-[#2b2e33]">
              Watch a real flight
            </Link>
            <a href="#how" className="rounded-md border border-[#cfc8ba] px-5 py-3 text-sm font-semibold text-[#15171a] hover:bg-[#ebe6db]">
              How it works
            </a>
          </div>
          {stats && (
            <dl className="mt-12 grid max-w-lg grid-cols-4 border-t border-[#e3ded3] pt-6">
              {[
                [stats.flights, "flights sealed on 0G"],
                [stats.decisions, "decisions by 0G"],
                [`${stats.intact}/${stats.flights}`, "records intact"],
                [stats.breaches, "breaches caught"],
              ].map(([n, l]) => (
                <div key={l as string}>
                  <dt className="font-mono text-2xl font-semibold text-[#15171a]">{n}</dt>
                  <dd className="mt-1 text-[11px] leading-tight text-[#8a8d93]">{l}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="rise overflow-hidden rounded-lg border border-[#d9d3c6] bg-[#ebe6db]" style={{ animationDelay: "0.15s" }}>
          <HeroAnimation />
        </div>
      </section>

      {/* problem */}
      <section>
        <SectionHead kicker="The problem" title="After a drone crash, the evidence belongs to the party being investigated." />
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#e3ded3] bg-[#e3ded3] md:grid-cols-3">
          {CASES.map((c) => (
            <article key={c.where} className="bg-[#fffdf8] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a8d93]">{c.where}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#b91c1c]">{c.fact}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#45484e]">{c.body}</p>
              <p className="mt-4 text-[11px] text-[#8a8d93]">{c.src}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm text-[#55595f]">No rule in the EU, UK, US or India requires drone logs to be tamper-evident or held independently. India mandated tamper-proof logging in March 2021, then deferred it five months later.</p>
      </section>

      {/* how */}
      <section id="how" className="scroll-mt-24">
        <SectionHead kicker="How SkyProof works" title="One flight, five steps. 0G decides and records, Chainlink judges, Arc pays." />
        <ol className="mt-10 grid gap-6 md:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t-2 border-[#15171a] pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-sm text-[#c2410c]">{s.n}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8a8d93]">{s.who}</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-snug text-[#15171a]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#55595f]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* real flight */}
      <section>
        <SectionHead kicker="A real flight" title="Rebuilt from 0G Storage and replayed in the city." />
        <div className="mt-10 h-[520px]">
          {flight ? <FlightReplay flight={flight} compact /> : <div className="grid h-full place-items-center rounded-lg border border-[#e3ded3] text-sm text-[#8a8d93]">Loading a sealed flight…</div>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#55595f]">
          <span>The camera follows the drone. Crowd, crane, fake sign, gust and battery fault, all decided by 0G.</span>
          {pick && (
            <Link href={`/flights/${pick.flightId}`} className="font-semibold text-[#15171a] underline decoration-[#c2410c] decoration-2 underline-offset-4">
              Open the full replay with every decision →
            </Link>
          )}
        </div>
      </section>

      {/* situations */}
      <section>
        <SectionHead kicker="What 0G decides" title="Not just yes or no. When something happens in flight, 0G chooses what the drone does." />
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#e3ded3] bg-[#e3ded3] sm:grid-cols-2 lg:grid-cols-3">
          {SITUATIONS.map((s) => (
            <div key={s.t} className="bg-[#fffdf8] p-5">
              <h3 className="font-semibold text-[#15171a]">{s.t}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.o.map((o) => (
                  <span key={o} className="rounded border border-[#e3ded3] bg-[#f6f3ec] px-1.5 py-0.5 font-mono text-[11px] text-[#33363b]">{o}</span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#8a8d93]">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* sponsors */}
      <section>
        <SectionHead kicker="Built on" title="Three networks, three jobs." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["0G", "Decides and records", "Vision model on 0G Private Computer in the decision loop. Black box on 0G Storage. DroneRegistry and FlightLog on 0G Chain.", "DroneRegistry 0xC3e0…1Adf · FlightLog 0x2E6F…cBa5"],
            ["Chainlink CRE", "Judges", "Triggered by the claim on Arc. Reads 0G Chain, verifies the record, checks the weather, applies rules B1–B6, writes the verdict.", "cre/judge · verdict workflow"],
            ["Arc", "Pays", "USDC bond locked by the operator. A BREACH verdict pays the victim automatically; REVIEW holds funds for the insurer.", "SkyProofEscrow 0x10da…44d8"],
          ].map(([name, job, body, addr]) => (
            <div key={name} className="rounded-lg border border-[#e3ded3] bg-[#fffdf8] p-6">
              <p className="text-2xl font-semibold tracking-tight text-[#15171a]">{name}</p>
              <p className="mt-1 text-sm font-medium text-[#c2410c]">{job}</p>
              <p className="mt-4 text-sm leading-relaxed text-[#55595f]">{body}</p>
              <p className="mt-5 font-mono text-[11px] text-[#8a8d93]">{addr}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-[#15171a] px-8 py-12 text-[#f4f1ea] md:px-12">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">A drone that cannot act without a recorded decision can&apos;t hide one.</h2>
        <p className="mt-4 max-w-2xl text-[#b9b3a8]">Missing records prove tampering. Every flight above was rebuilt from 0G and checked fingerprint by fingerprint.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/flights" className="rounded-md bg-[#f4f1ea] px-5 py-3 text-sm font-semibold text-[#15171a]">Browse sealed flights</Link>
          <Link href="/claim" className="rounded-md border border-[#55595f] px-5 py-3 text-sm font-semibold text-[#f4f1ea]">File a claim on Arc</Link>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">{kicker}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">{title}</h2>
    </div>
  );
}
