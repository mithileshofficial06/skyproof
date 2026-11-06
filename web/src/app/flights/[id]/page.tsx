"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import FlightReplay from "@/components/FlightReplay";
import { FlightSummary } from "@/components/FlightSummary";
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
          <Link href="/flights" className="text-xs text-[#8a8d93] hover:text-[#15171a]">
            ← All flights
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#15171a]">{data ? scenarioLabel(data.scenario) : error ? "Flight not found" : "Loading flight…"}</h1>
          {data && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#55595f]">
              <Badge tone="zg">Rebuilt from 0G Storage</Badge>
              <a href="#summary" className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-medium text-[#f5f6ff] hover:bg-white/20">
                Plain-English summary ↗
              </a>
              <Badge tone={data.report.ok ? "ok" : "deny"}>{data.report.ok ? "Every anchor matches" : "Record broken"}</Badge>
              <span className="font-mono">
                0G flight{" "}
                <a className="underline decoration-[#cfc8ba] hover:text-[#15171a]" href={data.chain.openTx ? `${ZG_EXPLORER}/tx/${data.chain.openTx}` : "#"} target="_blank" rel="noreferrer">
                  {short(data.chain.chainFlightId, 12)}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-[#b91c1c]">Could not load this flight: {error}</p>}
      {data && <FlightReplay flight={data} />}
      {data && <FlightSummary flightId={data.flightId} />}
    </div>
  );
}
