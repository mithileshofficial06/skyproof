"use client";
// "How it works" as a scroll story: the visual stays pinned while four steps scroll past. Each step
// lights up in its sponsor's colour and replays its own short animation when it becomes active.
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";

const STEPS = [
  {
    who: "0G Private Computer",
    color: "#7c5cff",
    title: "The drone asks 0G before it acts",
    body: "Before take-off, every reroute, drop and landing, and whenever something happens in flight, the drone sends its camera frame and state to a vision model on 0G. Without a fresh, signed answer the drone is not allowed to move.",
  },
  {
    who: "0G Storage + 0G Chain",
    color: "#7c5cff",
    title: "Every record seals itself, mid-flight",
    body: "Each decision, position and action is signed and chained to the one before. Every 15 seconds the new records are encrypted, uploaded to 0G Storage, and their fingerprint is anchored on 0G Chain. The operator can't edit what's already sealed.",
  },
  {
    who: "Chainlink CRE",
    color: "#375bd2",
    title: "An independent judge checks the record",
    body: "When a victim files a claim, a Chainlink workflow rebuilds the flight from 0G, checks every fingerprint against 0G Chain, pulls real weather, and applies six objective rules: area, height, approvals, overrides, record gaps, wind.",
  },
  {
    who: "Arc · USDC",
    color: "#0e8ea0",
    title: "A proven breach pays the victim",
    body: "The operator keeps a USDC bond locked on Arc or the drone can't fly. A BREACH verdict pays the victim from it automatically. Anything unclear is held for a human insurer, with the same sealed evidence.",
  },
];

export function Story() {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="scroll-mt-24">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">How SkyProof works</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">0G decides and records. Chainlink judges. Arc pays.</h2>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="lg:sticky lg:top-24 lg:h-[460px] lg:self-start">
          <div className="cockpit relative h-[380px] overflow-hidden rounded-xl border border-[#1f2b38] bg-[#0b1017] lg:h-full">
            <Grid />
            <div className="absolute left-4 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6c7c8d]">
              <span className="h-1.5 w-1.5 rounded-full blink" style={{ background: STEPS[step].color }} />
              step {step + 1} / 4 · {STEPS[step].who}
            </div>
            {[Decide, Seal, Judge, Pay].map((V, i) => (
              <div key={i} className={cx("absolute inset-0 transition-opacity duration-500", step === i ? "opacity-100" : "pointer-events-none opacity-0")}>
                {step === i && <V />}
              </div>
            ))}
            <div className="absolute inset-x-4 bottom-3 flex gap-1.5">
              {STEPS.map((s, i) => (
                <span key={i} className="h-1 flex-1 rounded-full transition-colors duration-500" style={{ background: i <= step ? s.color : "#1f2b38" }} />
              ))}
            </div>
          </div>
        </div>
        <div>
          {STEPS.map((s, i) => (
            <div key={i} data-i={i} ref={(el) => void (refs.current[i] = el)} className="flex min-h-[46vh] items-center py-6 lg:min-h-[62vh]">
              <div className={cx("border-l-[3px] pl-5 transition-all duration-500", step === i ? "opacity-100" : "opacity-35")} style={{ borderColor: step === i ? s.color : "#e3ded3" }}>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: s.color }}>
                  {String(i + 1).padStart(2, "0")} · {s.who}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#15171a]">{s.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#45484e]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Grid() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
      <defs>
        <pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="#4b6178" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>
  );
}

function DroneIcon({ color = "#e6edf5" }: { color?: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16">
      <g stroke={color} strokeWidth="2.4" fill="none">
        <path d="M20 20l24 24M44 20L20 44" />
        {[[16, 16], [48, 16], [16, 48], [48, 48]].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="9" ry="3" className="rotor" />
        ))}
      </g>
      <rect x="26" y="26" width="12" height="12" rx="3" fill={color} />
    </svg>
  );
}

function Decide() {
  return (
    <div className="flex h-full items-center justify-around px-8">
      <div className="flex flex-col items-center gap-2">
        <DroneIcon />
        <span className="font-mono text-[10px] text-[#94a3b3]">camera frame + state</span>
      </div>
      <div className="relative h-px w-28 bg-[#2a3a4c]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute -top-1 h-2 w-2 rounded-full bg-[#7c5cff]" style={{ offsetPath: "path('M0 0 L112 0')", animation: `travel 1.2s ${i * 0.4}s linear infinite` }} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-20 w-20 place-items-center rounded-xl border border-[#7c5cff]/60 bg-[#7c5cff]/10 font-mono text-sm font-semibold text-[#b4a2ff]">0G</div>
        <span className="stamp rounded border-2 border-[#10b981] px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-[#34d399]" style={{ animationDelay: "0.9s" }}>
          ALLOW
        </span>
        <span className="boot font-mono text-[10px] text-[#6c7c8d]" style={{ ["--d" as string]: "1.2s" }}>
          req 8400468e-acf8…
        </span>
      </div>
    </div>
  );
}

function Seal() {
  const n = 12;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-8">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: n }).map((_, i) => (
          <span key={i} className={cx("link-in h-7 w-7 rounded-md border", i < 8 ? "border-[#7c5cff] bg-[#7c5cff]/25" : "border-[#2a3a4c] bg-[#16212d]")} style={{ animationDelay: `${i * 110}ms` }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="seal-pulse grid h-12 w-12 place-items-center rounded-full border border-[#7c5cff] font-mono text-[10px] text-[#b4a2ff]" style={{ animationDelay: "1.3s" }}>
          AES
        </span>
        <span className="font-mono text-[11px] text-[#94a3b3]">→ 0G Storage → fingerprint on 0G Chain</span>
      </div>
      <span className="boot font-mono text-[11px] text-[#b4a2ff]" style={{ ["--d" as string]: "1.6s" }}>
        anchor tx 0x2581185d…6e5 · sealed ✓
      </span>
    </div>
  );
}

const RULES = ["B1 stayed in the permitted area", "B2 stayed under the height ceiling", "B3 every action had 0G's approval", "B4 never overrode a DENY", "B5 no gaps in the record", "B6 no take-off in unsafe wind"];
function Judge() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-[#375bd2]/50 bg-[#0f1726] p-4">
        <span className="sweep absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-[#375bd2]/30 to-transparent" />
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8ea5f0]">Chainlink CRE · verdict workflow</p>
        {RULES.map((r, i) => (
          <div key={r} className="boot flex items-center gap-2 py-1 text-[12px] text-[#c5d0db]" style={{ ["--d" as string]: `${300 + i * 260}ms` }}>
            <span className={cx("grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white", i === 2 ? "bg-[#ef4444]" : "bg-[#10b981]")}>{i === 2 ? "✗" : "✓"}</span>
            {r}
          </div>
        ))}
        <div className="stamp mt-3 inline-block rounded border-2 border-[#ef4444] px-2 py-0.5 font-mono text-sm font-bold text-[#f87171]" style={{ animationDelay: "2s" }}>
          BREACH · B3
        </div>
      </div>
    </div>
  );
}

function Pay() {
  return (
    <div className="flex h-full items-center justify-center gap-6 px-8">
      <div className="rounded-lg border border-[#0e8ea0]/60 bg-[#0e8ea0]/10 p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#67d4e2]">Operator bond</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-[#e6edf5]">10 USDC</p>
        <p className="font-mono text-[10px] text-[#6c7c8d]">locked on Arc</p>
      </div>
      <div className="relative h-10 w-36">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="coin-lr absolute left-0 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#2775ca] font-mono text-[9px] font-bold text-white" style={{ ["--d" as string]: `${i * 220}ms`}}>
            $
          </span>
        ))}
      </div>
      <div className="rounded-lg border border-[#10b981]/60 bg-[#10b981]/10 p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#5eead4]">Victim</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-[#e6edf5]">+5 USDC</p>
        <p className="boot font-mono text-[10px] text-[#34d399]" style={{ ["--d" as string]: "1.6s" }}>
          + 1 USDC deposit back
        </p>
      </div>
    </div>
  );
}
