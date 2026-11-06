// Plain building blocks for the victim and insurer screens: one job per screen, tech kept behind "Technical details".
import Link from "next/link";
import type { ReactNode } from "react";
import type { Permit, XY } from "@/lib/flight";
import { cx } from "./ui";

/** clean line icons (no emoji anywhere on the site) */
const PATHS: Record<string, ReactNode> = {
  alert: (<><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" /></>),
  inbox: (<><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5.5 5h13L21 13v6H3v-6l2.5-8Z" /></>),
  drone: (<><circle cx="5.5" cy="5.5" r="2.5" /><circle cx="18.5" cy="5.5" r="2.5" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /><path d="M7.5 7.5 10 10m4 0 2.5-2.5M7.5 16.5 10 14m4 0 2.5 2.5" /><rect x="10" y="10" width="4" height="4" rx="1" /></>),
  live: (<><circle cx="12" cy="12" r="2" /><path d="M8.5 8.5a5 5 0 0 0 0 7m7 0a5 5 0 0 0 0-7" /><path d="M5.6 5.6a9 9 0 0 0 0 12.8m12.8 0a9 9 0 0 0 0-12.8" /></>),
  folder: (<><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12Z" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>),
  cube: (<><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>),
  play: (<><path d="M7 5v14l12-7L7 5Z" /></>),
  chevron: (<><path d="m6 9 6 6 6-6" /></>),
};
export function Icon({ name, className = "h-7 w-7" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}


export type StepState = "done" | "now" | "todo" | "bad" | "warn";
export interface Step {
  title: string;
  detail?: ReactNode;
  state: StepState;
}

const DOT: Record<StepState, { cls: string; icon: string; word: string }> = {
  done: { cls: "bg-[#0f766e] text-white", icon: "✓", word: "Done" },
  now: { cls: "bg-[#7c5cff] text-white", icon: "●", word: "In progress" },
  todo: { cls: "border-2 border-[#cfc8ba] bg-transparent text-transparent", icon: "", word: "Not yet" },
  bad: { cls: "bg-[#b91c1c] text-white", icon: "✕", word: "Rejected" },
  warn: { cls: "bg-[#b45309] text-white", icon: "!", word: "Needs a person" },
};

/** a vertical status timeline: colour + icon + word, never colour alone */
export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => {
        const d = DOT[s.state];
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-[#e3ded3]" />}
            <span className={cx("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold", d.cls, s.state === "now" && "animate-pulse")} aria-hidden>
              {d.icon}
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx("text-base font-semibold", s.state === "todo" ? "text-[#8a8d93]" : "text-[#15171a]")}>{s.title}</span>
                <span className="sr-only">({d.word})</span>
              </div>
              {s.detail && <div className="mt-1 text-sm leading-relaxed text-[#55595f]">{s.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** closed by default: everything a non-technical reader can skip */
export function Details({ title = "Technical details", open, children }: { title?: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-lg border border-[#e3ded3] bg-[#fffdf8]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#33363b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7c5cff]">
        <span>{title}</span>
        <Icon name="chevron" className="h-4 w-4 text-[#8a8d93] transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-[#ece7dc] p-4">{children}</div>
    </details>
  );
}

/** big tappable card for "what do you need?" */
export function ChoiceCard({ href, icon, title, text, cta }: { href: string; icon: ReactNode; title: string; text: string; cta: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-xl border border-[#e3ded3] bg-[#fffdf8] p-6 transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7c5cff]">
      <span aria-hidden className="grid h-12 w-12 place-items-center rounded-lg border border-[#e3ded3] bg-[#f6f3ec] text-[#15171a]">{icon}</span>
      <span className="mt-4 text-xl font-semibold text-[#15171a]">{title}</span>
      <span className="mt-2 flex-1 text-[15px] leading-relaxed text-[#55595f]">{text}</span>
      <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-full bg-[#15171a] px-4 py-2 text-sm font-semibold text-[#f4f1ea]">
        {cta} <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

/** a short coloured status chip with an icon and a word */
export function Chip({ tone, children }: { tone: "ok" | "warn" | "bad" | "info" | "wait"; children: ReactNode }) {
  const c = {
    ok: "border-[#b7dcd6] bg-[#ecf7f5] text-[#0f5f59]",
    warn: "border-[#efd3a6] bg-[#fdf6ea] text-[#92400e]",
    bad: "border-[#f0c4c4] bg-[#fdf0f0] text-[#9b1c1c]",
    info: "border-[#d4d9e0] bg-[#f3f5f8] text-[#334155]",
    wait: "border-[#c7c2ef] bg-[#f1effd] text-[#3b2fa8]",
  }[tone];
  const icon = { ok: "✓", warn: "!", bad: "✕", info: "i", wait: "…" }[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", c)}>
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  );
}

/** one fact with a tick / warning, in plain words */
export function Fact({ ok, warn, children }: { ok: boolean; warn?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[15px] leading-snug">
      <span aria-hidden className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white", ok ? "bg-[#0f766e]" : warn ? "bg-[#b45309]" : "bg-[#b91c1c]")}>
        {ok ? "✓" : "!"}
      </span>
      <span className="text-[#33363b]">{children}</span>
    </div>
  );
}

/** a small top-down map: allowed area, no-fly zones, the drone's path, where the package came down and where the person says it happened */
export function MiniMap({ permit, path, drop, claimed, height = 220 }: { permit: Permit; path: XY[]; drop?: XY | null; claimed?: XY | null; height?: number }) {
  const xs = permit.geofence.map((p) => p[0]);
  const ys = permit.geofence.map((p) => p[1]);
  const pad = 0.4;
  const x0 = Math.min(...xs) - pad;
  const x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad;
  const y1 = Math.max(...ys) + pad;
  const W = 100;
  const H = (W * (y1 - y0)) / (x1 - x0);
  const P = ([x, y]: XY) => `${(((x - x0) / (x1 - x0)) * W).toFixed(2)},${(((y1 - y) / (y1 - y0)) * H).toFixed(2)}`;
  const pt = (p: XY) => P(p).split(",").map(Number) as [number, number];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full rounded-md border border-[#e3ded3] bg-[#f6f3ec]" role="img" aria-label="Map of the flight">
        <polygon points={permit.geofence.map(P).join(" ")} fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth={0.5} strokeDasharray="1.5 1" />
        {permit.noFly.map((z) => (
          <g key={z.name}>
            <polygon points={z.polygon.map(P).join(" ")} fill="rgba(239,68,68,0.18)" stroke="#ef4444" strokeWidth={0.4} />
            <text x={pt(z.polygon[0])[0] + 1} y={pt(z.polygon[0])[1] - 1.5} fontSize={3} fill="#ef4444">
              no-fly: {z.name.toLowerCase()}
            </text>
          </g>
        ))}
        {path.length > 1 && <polyline points={path.map(P).join(" ")} fill="none" stroke="#7c5cff" strokeWidth={0.8} strokeLinejoin="round" />}
        {drop && (
          <g>
            <circle cx={pt(drop)[0]} cy={pt(drop)[1]} r={1.8} fill="#e9c46a" stroke="#713f12" strokeWidth={0.4} />
          </g>
        )}
        {claimed && (
          <g>
            <circle cx={pt(claimed)[0]} cy={pt(claimed)[1]} r={3.2} fill="none" stroke="#ef4444" strokeWidth={0.6} />
            <circle cx={pt(claimed)[0]} cy={pt(claimed)[1]} r={1} fill="#ef4444" />
          </g>
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#55595f]">
        <span><span aria-hidden className="mr-1 inline-block h-0.5 w-4 align-middle bg-[#7c5cff]" />drone&apos;s path</span>
        <span><span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle bg-[#e9c46a]" />package came down</span>
        {claimed && <span><span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle border-2 border-[#ef4444]" />where the person says it happened</span>}
        <span><span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 align-middle border border-dashed border-[#10b981]" />allowed area</span>
      </figcaption>
    </figure>
  );
}

/** the judge's rule codes, in words a victim understands */
export const RULE_WORDS: Record<string, string> = {
  B1_GEOFENCE: "it flew where it was not allowed to fly",
  B2_ALTITUDE: "it flew higher than allowed",
  B3_UNAPPROVED_ACTION: "it acted without the AI's permission",
  B4_OVERRIDE_ON_DENY: "it ignored the AI saying no",
  B5_RECORD_BROKEN: "its black box record is missing or was changed",
  B6_UNSAFE_WIND_LAUNCH: "it took off in unsafe wind",
};
