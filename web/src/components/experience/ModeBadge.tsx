"use client";
// Always-visible data mode (specs/05-uiux.md 2, Honesty rule): LIVE, REPLAY or SANDBOX.
import { useUI } from "@/lib/store";

const MODES = {
  live: { label: "LIVE", dot: "bg-x-pass", text: "text-x-pass", note: "anchors read from 0G Chain now" },
  replay: { label: "REPLAY", dot: "bg-x-amber", text: "text-x-amber", note: "a recorded flight, played back" },
  sandbox: { label: "SANDBOX", dot: "bg-x-cyan", text: "text-x-cyan", note: "local simulation" },
} as const;

export function ModeBadge() {
  const mode = useUI((s) => s.mode);
  const m = MODES[mode];
  return (
    <div role="status" aria-live="polite" className="fixed right-4 top-[68px] z-40 flex items-center gap-2 rounded-full border border-x-border bg-x-surface/90 px-3 py-1.5 font-mono text-[11px] backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      <span className={`font-semibold tracking-[0.14em] ${m.text}`}>{m.label}</span>
      <span className="text-x-muted">· {m.note}</span>
    </div>
  );
}
