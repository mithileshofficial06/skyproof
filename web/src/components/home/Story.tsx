"use client";
// "How it works" as a horizontal pipeline: four stations on one line, a packet travels between them,
// and the active station opens below. Auto-plays while on screen (pauses on hover); click to jump.
import { useEffect, useState } from "react";
import { useInView } from "@/components/motion";
import { cx } from "@/components/ui";

const STEPS = [
  {
    key: "Decide",
    who: "0G Private Computer",
    color: "#7c5cff",
    tint: "#f3f0ff",
    title: "The drone asks 0G before it acts",
    body: "Before take-off, every reroute, drop and landing, and whenever something happens in flight, the drone sends its camera frame and state to a vision model on 0G. Without a fresh, signed answer the drone is not allowed to move.",
  },
  {
    key: "Seal",
    who: "0G Storage + 0G Chain",
    color: "#6d4fe0",
    tint: "#f1eefe",
    title: "Every record seals itself, mid-flight",
    body: "Each decision, position and action is signed and chained to the one before. Every 15 seconds the new records are encrypted, uploaded to 0G Storage, and their fingerprint is anchored on 0G Chain.",
  },
  {
    key: "Judge",
    who: "Chainlink CRE",
    color: "#375bd2",
    tint: "#eef2fd",
    title: "An independent judge checks the record",
    body: "When a victim files a claim, a Chainlink workflow rebuilds the flight from 0G, checks every fingerprint against 0G Chain, pulls real weather and applies six objective rules.",
  },
  {
    key: "Pay",
    who: "Arc · USDC",
    color: "#0e8ea0",
    tint: "#eaf7f9",
    title: "A proven breach pays the victim",
    body: "The operator keeps a USDC bond locked on Arc or the drone can't fly. A BREACH verdict pays the victim from it automatically; anything unclear goes to a human insurer with the same evidence.",
  },
];
const DWELL = 5200;

export function Story() {
  const [ref, seen] = useInView<HTMLElement>(false, "0px");
  const [step, setStep] = useState(0);
  const [hold, setHold] = useState(false);
  const [tick, setTick] = useState(0); // restarts the progress bar when the user jumps

  useEffect(() => {
    if (!seen || hold) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), DWELL);
    return () => clearTimeout(t);
  }, [seen, hold, step, tick]);

  const s = STEPS[step];
  const go = (i: number) => {
    setStep(i);
    setTick((x) => x + 1);
  };

  return (
    <section id="how" ref={ref} className="scroll-mt-24" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">How SkyProof works</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">0G decides and records. Chainlink judges. Arc pays.</h2>

      {/* the line */}
      <div className="relative mt-12">
        <div className="absolute left-[12.5%] right-[12.5%] top-7 h-[3px] rounded-full bg-[#e3ded3]" />
        <div className="absolute left-[12.5%] top-7 h-[3px] rounded-full transition-all duration-700 ease-out" style={{ width: `${(step / (STEPS.length - 1)) * 75}%`, background: s.color }} />
        {/* the packet */}
        <span className="absolute top-7 z-0 -ml-2 -mt-[7px] h-4 w-4 rounded-full transition-all duration-700 ease-out" style={{ left: `${12.5 + step * 25}%`, background: s.color, boxShadow: `0 0 0 6px ${s.color}22, 0 0 18px ${s.color}` }} />
        <div className="relative z-10 grid grid-cols-4">
          {STEPS.map((x, i) => (
            <button key={x.key} onClick={() => go(i)} className="group flex flex-col items-center gap-3 text-center">
              <span
                className={cx("grid h-14 w-14 place-items-center rounded-2xl border-2 font-mono text-sm font-bold transition-all duration-500", i === step ? "scale-110 text-white" : i < step ? "text-[#e1e3fa]" : "bg-[#0c0e2a]/70 text-[#8f93c4] group-hover:border-white/40")}
                style={{ background: i <= step ? `linear-gradient(${x.color}${i === step ? "33" : "1a"}, ${x.color}${i === step ? "33" : "1a"}), #0c0e2a` : undefined, borderColor: i <= step ? x.color : "rgba(255,255,255,0.14)", boxShadow: i === step ? `0 0 0 6px ${x.color}1f` : undefined }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cx("text-sm font-semibold transition-colors", i === step ? "text-[#15171a]" : "text-[#8a8d93]")}>{x.key}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-[#8a8d93] sm:block">{x.who}</span>
              {i === step && (
                <span className="h-[3px] w-16 overflow-hidden rounded-full bg-[#e3ded3]">
                  <span key={`${step}-${tick}-${hold}`} className="block h-full rounded-full" style={{ background: x.color, animation: hold ? "none" : `beatbar ${DWELL}ms linear forwards`, width: hold ? "100%" : undefined }} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* the open station */}
      <div key={step} className="station mt-10 grid overflow-hidden rounded-2xl border border-l-[3px] bg-[#0c0e2a]/70 backdrop-blur-lg lg:grid-cols-[0.9fr_1.1fr]" style={{ borderColor: "rgba(255,255,255,0.1)", borderLeftColor: s.color }}>
        <div className="p-7 md:p-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: s.color }}>
            {String(step + 1).padStart(2, "0")} · {s.who}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#15171a] md:text-[28px]">{s.title}</h3>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#45484e]">{s.body}</p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => go((step + STEPS.length - 1) % STEPS.length)} className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#f5f6ff] hover:bg-white/20">
              ← Back
            </button>
            <button onClick={() => go((step + 1) % STEPS.length)} className="rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ background: s.color }}>
              Next →
            </button>
          </div>
        </div>
        <div className="relative min-h-[300px] border-t lg:border-l lg:border-t-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {[<Decide key={0} />, <Seal key={1} />, <Judge key={2} />, <Pay key={3} />][step]}
        </div>
      </div>
    </section>
  );
}

function DroneIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16">
      <g stroke="#f5f6ff" strokeWidth="2.4" fill="none">
        <path d="M20 20l24 24M44 20L20 44" />
        {[[16, 16], [48, 16], [16, 48], [48, 48]].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="9" ry="3" className="rotor" />
        ))}
      </g>
      <rect x="26" y="26" width="12" height="12" rx="3" fill="#f5f6ff" />
    </svg>
  );
}

function Decide() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-around px-8">
      <div className="flex flex-col items-center gap-2">
        <DroneIcon />
        <span className="font-mono text-[10px] text-[#55595f]">camera frame + state</span>
      </div>
      <div className="relative h-px w-28 bg-[#d9d3c6]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute -top-1 h-2 w-2 rounded-full bg-[#7c5cff]" style={{ offsetPath: "path('M0 0 L112 0')", animation: `travel 1.2s ${i * 0.4}s linear infinite` }} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-[#7c5cff] bg-[#7c5cff]/15 font-mono text-sm font-bold text-[#cfc4ff]">0G</div>
        <span className="stamp rounded border-2 border-[#0f766e] px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-[#0f766e]" style={{ animationDelay: "0.8s" }}>
          ALLOW
        </span>
        <span className="boot font-mono text-[10px] text-[#8a8d93]" style={{ ["--d" as string]: "1.1s" }}>
          req 8400468e-acf8…
        </span>
      </div>
    </div>
  );
}

function Seal() {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-7 px-8">
      <div className="flex items-center">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="flex items-center">
            <span className={cx("link-in h-7 w-7 rounded-md border-2", i < 7 ? "border-[#6d4fe0] bg-[#ebe6ff]" : "border-[#e3ded3] bg-white")} style={{ animationDelay: `${i * 110}ms` }} />
            {i < 9 && <span className="link-in h-[2px] w-2 bg-[#cfc8ba]" style={{ animationDelay: `${i * 110 + 60}ms` }} />}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="seal-pulse grid h-12 w-12 place-items-center rounded-full bg-[#6d4fe0] font-mono text-[10px] font-bold text-white" style={{ animationDelay: "1.2s" }}>
          AES
        </span>
        <span className="font-mono text-[11px] text-[#55595f]">→ 0G Storage → fingerprint on 0G Chain</span>
      </div>
      <span className="boot rounded-full bg-[#ebe6ff] px-3 py-1 font-mono text-[11px] text-[#4c35b5]" style={{ ["--d" as string]: "1.5s" }}>
        anchor tx 0x2581185d…6e5 · sealed ✓
      </span>
    </div>
  );
}

const RULES = ["B1 stayed in the permitted area", "B2 stayed under the height ceiling", "B3 every action had 0G's approval", "B4 never overrode a DENY", "B5 no gaps in the record", "B6 no take-off in unsafe wind"];
function Judge() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center px-8 py-6">
      <div className="w-full max-w-sm">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#375bd2]">Chainlink CRE · verdict workflow</p>
        {RULES.map((r, i) => (
          <div key={r} className="boot flex items-center gap-2 border-b border-[#eef2fd] py-1.5 text-[13px] text-[#33363b]" style={{ ["--d" as string]: `${200 + i * 230}ms` }}>
            <span className={cx("grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white", i === 2 ? "bg-[#b91c1c]" : "bg-[#375bd2]")}>{i === 2 ? "✗" : "✓"}</span>
            {r}
          </div>
        ))}
        <div className="stamp mt-3 inline-block rounded border-2 border-[#b91c1c] px-2 py-0.5 font-mono text-sm font-bold text-[#b91c1c]" style={{ animationDelay: "1.8s" }}>
          BREACH · B3
        </div>
      </div>
    </div>
  );
}

function Pay() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center gap-5 px-8">
      <div className="rounded-xl border border-[#bfe0e8] bg-[#eaf7f9] p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#0e7490]">Operator bond</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-[#15171a]">10 USDC</p>
        <p className="font-mono text-[10px] text-[#8a8d93]">locked on Arc</p>
      </div>
      <div className="relative h-10 w-36">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#bfe0e8]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="coin-lr absolute left-0 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#2775ca] font-mono text-[9px] font-bold text-white shadow" style={{ ["--d" as string]: `${i * 220}ms` }}>
            $
          </span>
        ))}
      </div>
      <div className="rounded-xl border border-[#b7dcd6] bg-[#ecf7f5] p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#0f5f59]">Victim</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-[#0f766e]">+5 USDC</p>
        <p className="boot font-mono text-[10px] text-[#0f766e]" style={{ ["--d" as string]: "1.6s" }}>
          + 1 USDC deposit back
        </p>
      </div>
    </div>
  );
}
