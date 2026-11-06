import type { ReactNode } from "react";
import { short } from "@/lib/flight";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Panel({ title, icon, right, children, className }: { title?: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-[#e3ded3] bg-[#fffdf8]", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-[#ece7dc] px-4 py-3">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#15171a]">
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
  zg: "border-[#c7c2ef] bg-[#f1effd] text-[#3b2fa8]",
  ok: "border-[#b7dcd6] bg-[#ecf7f5] text-[#0f5f59]",
  deny: "border-[#f0c4c4] bg-[#fdf0f0] text-[#9b1c1c]",
  warn: "border-[#efd3a6] bg-[#fdf6ea] text-[#92400e]",
  info: "border-[#d4d9e0] bg-[#f3f5f8] text-[#334155]",
  link: "border-[#c9d6ef] bg-[#eef3fc] text-[#1e40af]",
  arc: "border-[#bfe0e8] bg-[#eef8fa] text-[#155e75]",
  mute: "border-[#e3ded3] bg-[#f6f3ec] text-[#55595f]",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "mute", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium", TONES[tone], className)}>{children}</span>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-md border border-[#ece7dc] bg-[#faf8f3] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8a8d93]">{label}</div>
      <div className={cx("mt-1 font-mono text-lg font-semibold tabular-nums", tone === "good" ? "text-[#0f766e]" : tone === "bad" ? "text-[#b91c1c]" : tone === "warn" ? "text-[#b45309]" : "text-[#15171a]")}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[#8a8d93]">{sub}</div>}
    </div>
  );
}

export function HashLink({ href, hash, n = 8 }: { href?: string; hash?: string | null; n?: number }) {
  if (!hash) return <span className="font-mono text-xs text-[#8a8d93]">—</span>;
  const body = <span className="font-mono text-xs text-[#33363b]">{short(hash, n)}</span>;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-[#cfc8ba] underline-offset-2 hover:decoration-[#15171a]">
      {body}
    </a>
  ) : (
    body
  );
}

export const sourceTone = (s?: string): Tone => (s?.startsWith("0G") ? "zg" : s === "HARD_RULES" ? "warn" : s === "NONE" ? "deny" : "mute");

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-semibold tracking-tight", dark ? "text-white" : "text-[#15171a]", className)}>
      <svg viewBox="0 0 28 28" className="h-7 w-7">
        <rect width="28" height="28" rx="6" fill={dark ? "#1b2633" : "#15171a"} />
        <g stroke="#f4f1ea" strokeWidth="1.8" fill="none">
          <circle cx="8.5" cy="8.5" r="3" />
          <circle cx="19.5" cy="8.5" r="3" />
          <circle cx="8.5" cy="19.5" r="3" />
          <circle cx="19.5" cy="19.5" r="3" />
          <path d="M11 11l6 6M17 11l-6 6" />
        </g>
        <rect x="12" y="12" width="4" height="4" fill="#c2410c" />
      </svg>
      SkyProof
    </span>
  );
}
