"use client";
// Real facts under each station section, from the sealed flight (store). Explorer links only where something exists.
import { useUI } from "@/lib/store";

const chip = "inline-flex items-center gap-1.5 rounded-full border border-x-border bg-x-surface2 px-2.5 py-1 font-mono text-[11px]";

export function StationInfo({ id }: { id: "zerog" | "chainlink" | "arc" }) {
  const f = useUI((s) => s.flight);
  const verdict = useUI((s) => s.verdict);
  if (!f) return null;
  const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-4)}`;
  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-x-border pt-4">
      {id === "zerog" && (
        <>
          <a href={f.zeroG.url} target="_blank" rel="noreferrer" className={`${chip} text-x-text hover:border-x-cyan/50`}>
            0G flight {short(f.zeroG.recordId)} ↗
          </a>
          <span className={`${chip} text-x-muted`}>{f.blocks.filter((b) => b.type === "DECISION").length} decisions by 0G</span>
          <span className={`${chip} text-x-muted`}>{f.anchors.length} anchors on FlightLog</span>
        </>
      )}
      {id === "chainlink" && (
        <>
          <span className={`${chip} ${f.chainlink.verdict === "BREACH" ? "text-x-danger" : "text-x-amber"}`}>sealed record: {f.chainlink.verdict}</span>
          {f.chainlink.breaches.length > 0 && <span className={`${chip} text-x-muted`}>{[...new Set(f.chainlink.breaches)].join(", ")}</span>}
          {verdict === "fail" && <span className={`${chip} text-x-danger`}>edited copy: rejected</span>}
          {f.chainlink.url && (
            <a href={f.chainlink.url} target="_blank" rel="noreferrer" className={`${chip} text-x-text`}>
              verdict trigger on Arc ↗
            </a>
          )}
        </>
      )}
      {id === "arc" && (
        <>
          <span className={`${chip} ${f.arc.status === "paid" ? "text-x-pass" : f.arc.status === "held" ? "text-x-amber" : "text-x-muted"}`}>
            {f.arc.status === "paid" ? `claim #${f.arc.claimId}: paid` : f.arc.status === "held" ? `claim #${f.arc.claimId}: held for the insurer` : f.arc.status === "pending" ? "claim open" : "no claim filed for this flight"}
          </span>
          {f.arc.url && (
            <a href={f.arc.url} target="_blank" rel="noreferrer" className={`${chip} text-x-text`}>
              SkyProofEscrow on Arc ↗
            </a>
          )}
        </>
      )}
    </div>
  );
}
