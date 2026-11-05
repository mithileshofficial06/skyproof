"use client";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { useIndex } from "@/lib/data";
import { scenarioLabel, short } from "@/lib/flight";

export default function Flights() {
  const { data, error } = useIndex();
  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Flight replays</h1>
        <p className="mt-2 max-w-2xl text-slate-400">Every flight below was rebuilt from 0G alone: segments downloaded from 0G Storage, checked hash by hash against the fingerprints on 0G Chain. Pick one to replay it in 3D.</p>
      </div>
      {error && <p className="text-rose-300">Could not load flights: {error}</p>}
      {!data && !error && <p className="text-slate-500">Loading…</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((f) => (
          <Link key={f.flightId} href={`/flights/${f.flightId}`} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/[0.05]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold text-white group-hover:text-violet-200">{scenarioLabel(f.scenario)}</div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">{f.startedAt ? new Date(f.startedAt).toLocaleString() : ""}</div>
              </div>
              <Badge tone={f.verdict === "BREACH" ? "deny" : "ok"}>{f.verdict}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                [f.zgDecisions, "0G decisions"],
                [f.records, "records"],
                [f.intact ? "✓" : "✕", "intact"],
              ].map(([n, l]) => (
                <div key={l as string} className="rounded-lg bg-black/25 py-2">
                  <div className="font-mono text-lg font-semibold text-slate-100">{n}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {f.breaches.map((b) => (
                <Badge key={b} tone="deny">{b}</Badge>
              ))}
              {f.claims.map((c) => (
                <Badge key={c.claimId} tone={c.state === "Paid" ? "arc" : "warn"}>
                  Arc claim #{c.claimId}: {c.state}
                </Badge>
              ))}
            </div>
            <div className="mt-3 font-mono text-[10px] text-slate-600">0G flight {short(f.chainFlightId, 12)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
