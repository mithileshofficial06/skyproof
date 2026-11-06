// replay: a published sealed flight, played back (works offline; also the demo-failure fallback).
import type { FlightFile } from "../flight";
import { flightFile } from "../siteData";
import { toFlightRecord } from "./map";
import type { FlightSource } from "./types";

export async function fetchFlight(id?: string): Promise<FlightFile> {
  const r = id ? await flightFile(`${encodeURIComponent(id)}.json`) : await fetch("/data/sample-flight.json");
  if (!r.ok) throw new Error(id ? `flight ${id} not found` : "sample flight missing");
  return r.json();
}

export const replaySource: FlightSource = {
  async load(id) {
    return toFlightRecord(await fetchFlight(id), "replay");
  },
};
