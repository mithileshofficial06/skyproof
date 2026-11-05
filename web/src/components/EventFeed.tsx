"use client";
import { useEffect, useRef } from "react";
import type { FlightEvent } from "@/lib/flight";
import { Badge, cx, sourceTone } from "./ui";

const DOT: Record<FlightEvent["status"], string> = {
  ok: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]",
  deny: "bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.9)]",
  warn: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]",
  info: "bg-sky-400",
  breach: "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,1)]",
};

export function EventFeed({ events, now, onSeek }: { events: FlightEvent[]; now: number; onSeek?: (t: number) => void }) {
  const visible = events.filter((e) => e.t <= now + 0.05);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // scroll only the feed's own scroll container, never the page
    const el = box.current?.parentElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length]);
  return (
    <div ref={box} className="space-y-2">
      {visible.map((e, i) => {
        const latest = i === visible.length - 1;
        return (
          <button
            key={`${e.seq}-${e.kind}`}
            onClick={() => onSeek?.(e.t)}
            className={cx(
              "group w-full rounded-xl border px-3 py-2.5 text-left transition-all",
              latest ? "border-violet-400/40 bg-violet-500/[0.08] ring-1 ring-violet-400/20" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
              e.status === "breach" && "border-rose-500/40 bg-rose-500/[0.07]",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[e.status])} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-slate-100">{e.title}</span>
                  {e.source && <Badge tone={sourceTone(e.source)}>{e.source === "NONE" ? "no 0G decision" : e.source}</Badge>}
                  {e.latencyMs ? <span className="font-mono text-[10px] text-slate-500">{(e.latencyMs / 1000).toFixed(1)}s</span> : null}
                </div>
                {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{e.detail}</p>}
                {e.options && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.options.map((o) => (
                      <span
                        key={o.id}
                        title={o.vetoed ? `vetoed by permit: ${o.vetoed}` : o.label}
                        className={cx(
                          "rounded-md border px-1.5 py-0.5 font-mono text-[10px]",
                          o.chosen ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200" : o.vetoed ? "border-rose-400/30 text-rose-300/70 line-through" : "border-white/10 text-slate-400",
                        )}
                      >
                        {o.id}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-slate-500">
                  <span>t+{e.t.toFixed(1)}s</span>
                  <span>record #{e.seq}</span>
                  {e.zgRequestId && <span className="truncate text-violet-300/80">0G {e.zgRequestId}</span>}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
