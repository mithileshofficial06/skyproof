"use client";
// Landing hero: a live, slowly drifting blurred colour field (navy -> indigo -> lavender light, warm olive below)
// behind a centred SkyProof mark + wordmark. Text is set light and wide to sit on the soft field.
import Link from "next/link";
import { CountUp } from "@/components/motion";

const WORD = "SKYPROOF";

function Mark() {
  // drone seen from above: four rotors on an X, a sealed core
  return (
    <svg viewBox="0 0 64 64" className="h-[clamp(3rem,7vw,5.5rem)] w-[clamp(3rem,7vw,5.5rem)]" aria-hidden>
      <g fill="none" stroke="#f5f6ff" strokeWidth="2.6" strokeLinecap="round">
        <path d="M20 20 L44 44 M44 20 L20 44" />
        {[[16, 16], [48, 16], [16, 48], [48, 48]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="8" className="mark-rotor" />
        ))}
      </g>
      <rect x="26" y="26" width="12" height="12" rx="3" fill="#f5f6ff" />
    </svg>
  );
}

export function Hero({ stats, liveHref, replayHref }: { stats: { label: string; value: number | null }[]; liveHref: string; replayHref: string }) {
  return (
    <section className="relative left-1/2 -mt-20 flex min-h-[100svh] w-screen -translate-x-1/2 items-center overflow-hidden bg-[#04050c] text-[#f5f6ff]">
      {/* live blurred colour field */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="blob blob-c" />
        <div className="blob blob-d" />
        <div className="absolute inset-0 bg-[#04050c]/20" />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <p className="hero-fade font-mono text-[11px] uppercase tracking-[0.3em] text-[#c9ccf2]/80" style={{ ["--d" as string]: "0ms" }}>
          ETHGlobal Mumbai 2026 · 0G · Chainlink CRE · Arc
        </p>

        <div className="mt-10 flex items-center justify-center gap-[clamp(0.75rem,2vw,1.75rem)]">
          <span className="hero-fade" style={{ ["--d" as string]: "100ms" }}>
            <Mark />
          </span>
          <h1 aria-label="SkyProof" className="flex font-light leading-none tracking-[0.08em] text-[clamp(3.2rem,11vw,10rem)]">
            {WORD.split("").map((ch, i) => (
              <span key={i} aria-hidden className="sp-letter" style={{ ["--d" as string]: `${200 + i * 60}ms` }}>
                {ch}
              </span>
            ))}
          </h1>
        </div>

        <p className="hero-fade mx-auto mt-8 max-w-2xl text-xl font-light tracking-wide text-[#e4e6ff] sm:text-2xl" style={{ ["--d" as string]: "900ms" }}>
          The independent black box for autonomous drones.
        </p>
        <p className="hero-fade mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#c9ccf2]/80" style={{ ["--d" as string]: "1050ms" }}>
          0G decides every move and seals the record mid-flight. Chainlink judges it. Arc pays the victim when a rule was broken.
        </p>

        <div className="hero-fade mt-9 flex flex-wrap justify-center gap-3" style={{ ["--d" as string]: "1200ms" }}>
          <Link href={liveHref} className="rounded-full bg-[#f5f6ff] px-6 py-3 text-sm font-semibold text-[#0a0d24] transition-colors hover:bg-white">
            Watch it fly live
          </Link>
          <Link href={replayHref} className="rounded-full border border-[#f5f6ff]/35 bg-[#f5f6ff]/5 px-6 py-3 text-sm font-semibold text-[#f5f6ff] backdrop-blur transition-colors hover:border-[#f5f6ff]/70">
            Replay a sealed flight
          </Link>
        </div>

        <dl className="hero-fade mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4" style={{ ["--d" as string]: "1350ms" }}>
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="font-mono text-3xl font-light text-[#f5f6ff]">{s.value === null ? "…" : <CountUp to={s.value} />}</dt>
              <dd className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#c9ccf2]/70">{s.label}</dd>
            </div>
          ))}
        </dl>

        <a href="#problem" className="hero-fade mt-14 inline-block font-mono text-[11px] uppercase tracking-[0.3em] text-[#c9ccf2]/70 hover:text-[#f5f6ff]" style={{ ["--d" as string]: "1500ms" }}>
          Why it matters ↓
        </a>
      </div>
    </section>
  );
}
