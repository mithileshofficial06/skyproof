"use client";
import { useEffect, useState } from "react";
import type { FlightFile, FlightIndexEntry } from "./flight";
import { flightFile, flightIndex } from "./siteData";

export function useIndex() {
  const [data, setData] = useState<FlightIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    flightIndex()
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);
  return { data, error };
}

export function useFlight(id: string | null) {
  const [data, setData] = useState<FlightFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    setData(null);
    flightFile(`${id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)));
  }, [id]);
  return { data, error };
}

/** Prefer the richest recent flight of a scenario (with recorded scene data). */
export function pickFlight(index: FlightIndexEntry[], scenario: string) {
  return index.filter((f) => f.scenario === scenario).sort((a, b) => b.records - a.records || (b.startedAt ?? 0) - (a.startedAt ?? 0))[0] ?? index[0];
}
