import type { ReactNode } from "react";
import { short } from "@/lib/flight";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Panel({ title, icon, right, children, className }: { title?: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur-xl", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-slate-200">
            {icon}
            {title}
          </h3>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const TONES = {
  zg: "border-violet-400/30 bg-violet-500/15 text-violet-200",
  ok: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  deny: "border-rose-400/30 bg-rose-500/15 text-rose-200",
  warn: "border-amber-400/30 bg-amber-500/15 text-amber-200",
  info: "border-sky-400/30 bg-sky-500/15 text-sky-200",
  link: "border-blue-400/30 bg-blue-500/15 text-blue-200",
  arc: "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
  mute: "border-white/10 bg-white/5 text-slate-300",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "mute", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", TONES[tone], className)}>{children}</span>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={cx("mt-1 font-mono text-lg font-semibold tabular-nums", tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-slate-100")}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function HashLink({ href, hash, n = 8 }: { href?: string; hash?: string | null; n?: number }) {
  if (!hash) return <span className="font-mono text-xs text-slate-500">—</span>;
  const body = <span className="font-mono text-xs text-slate-300">{short(hash, n)}</span>;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-white/60">
      {body}
    </a>
  ) : (
    body
  );
}

export const sourceTone = (s?: string): Tone => (s?.startsWith("0G") ? "zg" : s === "HARD_RULES" ? "warn" : s === "NONE" ? "deny" : "mute");

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-[0_0_24px_-4px_rgba(139,92,246,0.8)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M8 8l8 8M16 8l-8 8" />
        </svg>
      </span>
      Sky<span className="-ml-2 text-cyan-300">Proof</span>
    </span>
  );
}
