"use client";
import { useEffect, useRef } from "react";
import { ZG_EXPLORER, type FlightEvent } from "@/lib/flight";
import { Badge, cx, sourceTone } from "./ui";

const BAR: Record<FlightEvent["status"], string> = { ok: "bg-[#0f766e]", deny: "bg-[#b91c1c]", warn: "bg-[#b45309]", info: "bg-[#94a3b8]", breach: "bg-[#b91c1c]" };

export function EventFeed({ events, now, onSeek }: { events: FlightEvent[]; now: number; onSeek?: (t: number) => void }) {
  const visible = events.filter((e) => e.t <= now + 0.05);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current?.parentElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length]);
  return (
    <div ref={box} className="divide-y divide-[#ece7dc]">
      {visible.map((e, i) => {
        const latest = i === visible.length - 1;
        return (
          <div role="button" tabIndex={0} key={`${e.seq}-${e.kind}`} onClick={() => onSeek?.(e.t)} className={cx("oz-card rowin relative flex w-full cursor-pointer gap-3 py-3 pl-3 pr-2 text-left transition-colors hover:bg-[#f6f3ec]", latest && "oz-latest bg-[#f6f3ec]")}>
            <span className={cx("absolute left-0 top-3 bottom-3 w-[3px] rounded", BAR[e.status])} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cx("text-[13px] font-semibold", e.status === "breach" ? "text-[#9b1c1c]" : "text-[#15171a]")}>{e.title}</span>
                {e.kind === "decision" && (
                  // the verdict lands like a stamp
                  <span className={cx("stamp rounded-sm border-2 px-1 font-mono text-[10px] font-bold tracking-wider", e.status === "ok" ? "border-[#0f766e] text-[#0f766e]" : e.status === "deny" ? "border-[#b91c1c] text-[#b91c1c]" : "border-[#b45309] text-[#b45309]")} style={{ animationDelay: "120ms" }}>
                    {e.status === "ok" ? "ALLOW" : e.status === "deny" ? "DENY" : "NO DECISION"}
                  </span>
                )}
                {e.source && <Badge tone={sourceTone(e.source)}>{e.source === "NONE" ? "no 0G decision" : e.source}</Badge>}
                {e.latencyMs ? <span className="font-mono text-[10px] text-[#8a8d93]">{(e.latencyMs / 1000).toFixed(1)}s</span> : null}
              </div>
              {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-[#55595f]">{e.detail}</p>}
              {e.options && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {e.options.map((o) => (
                    <span key={o.id} title={o.vetoed ? `vetoed by permit: ${o.vetoed}` : o.label} className={cx("rounded border px-1.5 py-0.5 font-mono text-[10px]", o.chosen ? "border-[#0f766e] bg-[#0f766e] text-white" : o.vetoed ? "border-[#f0c4c4] text-[#b91c1c] line-through" : "border-[#e3ded3] text-[#6b6f76]")}>
                      {o.id}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-[#8a8d93]">
                <span>t+{e.t.toFixed(1)}s</span>
                <span>#{e.recordSeq ?? e.seq}</span>
              </div>
              {(e.kind === "decision" || e.kind === "situation") && (
                <div className="mt-1 space-y-0.5 font-mono text-[10px] leading-snug">
                  {e.zgRequestId && (
                    <div className="flex gap-1.5 text-[#55595f]">
                      <span className="w-[52px] shrink-0 text-[#8a8d93]">0G req</span>
                      <span className="select-all break-all">{e.zgRequestId}</span>
                    </div>
                  )}
                  {e.tee && (
                    <div className="flex gap-1.5 text-[#55595f]">
                      <span className="w-[52px] shrink-0 text-[#8a8d93]">0G TEE</span>
                      <span className={e.tee.attested ? "text-[#0f766e]" : "text-[#8a8d93]"} title={e.tee.attested ? `Decided by a 0G provider attested to run in a TEE (${e.tee.teeType ?? "TEE"}, verifier ${e.tee.verifier ?? "?"}); the call was ${e.tee.e2ee === "sealed" ? "end-to-end encrypted (sealed)" : "not sealed"}` : "provider not TEE-attested"}>
                        {e.tee.attested ? `attested · ${e.tee.teeType ?? "TEE"}${e.tee.e2ee === "sealed" ? " · sealed" : ""}` : "not attested"}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <span className="w-[52px] shrink-0 text-[#8a8d93]">0G tx</span>
                    {e.anchorTx ? (
                      <a href={`${ZG_EXPLORER}/tx/${e.anchorTx}`} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="break-all text-[#3b2fa8] underline decoration-[#cfc8ba] hover:text-[#15171a]">
                        {e.anchorTx}
                      </a>
                    ) : (
                      <span className="text-[#b45309]">sealing on 0G Chain…</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
