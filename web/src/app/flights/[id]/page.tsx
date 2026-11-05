"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import FlightReplay from "@/components/FlightReplay";
import { Badge } from "@/components/ui";
import { useFlight } from "@/lib/data";
import { scenarioLabel, short, ZG_EXPLORER } from "@/lib/flight";

export default function FlightPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useFlight(id);
  return (
    <div className="space-y-5 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/flights" className="text-xs text-slate-500 hover:text-slate-300">
            ← All flights
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{data ? scenarioLabel(data.scenario) : "Loading flight…"}</h1>
          {data && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <Badge tone="zg">Rebuilt from 0G Storage</Badge>
              <Badge tone={data.report.ok ? "ok" : "deny"}>{data.report.ok ? "Every anchor matches" : "Record broken"}</Badge>
              <span className="font-mono">
                0G flight{" "}
                <a className="underline decoration-white/20 hover:text-white" href={data.chain.openTx ? `${ZG_EXPLORER}/tx/${data.chain.openTx}` : "#"} target="_blank" rel="noreferrer">
                  {short(data.chain.chainFlightId, 12)}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-rose-300">Could not load this flight: {error}</p>}
      {data && <FlightReplay flight={data} />}
    </div>
  );
}
