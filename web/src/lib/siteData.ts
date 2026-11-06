// Published flights: the copies deployed with the site, plus any flight published later on the operator's
// computer (served by its evidence server). A flight a judge runs on the hosted site shows up here at once.
import { EVIDENCE_URL } from "./arc";
import type { FlightIndexEntry } from "./flight";

const isLocal = (h: string) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(h);
/** skip the operator's computer when it is only "localhost" and this page is not (it would point at the visitor's own machine) */
const remoteOk = () => {
  try {
    return !(isLocal(new URL(EVIDENCE_URL).hostname) && typeof window !== "undefined" && !isLocal(window.location.hostname));
  } catch {
    return false;
  }
};
const remote = (name: string) => fetch(`${EVIDENCE_URL}/site/flights/${name}`, { cache: "no-store" });

/** a file from the published flights folder: deployed copy first, then the operator's computer */
export async function flightFile(name: string): Promise<Response> {
  const local = await fetch(`/data/flights/${name}`).catch(() => null);
  if (local?.ok || !remoteOk()) return local ?? new Response(null, { status: 404 });
  const r = await remote(name).catch(() => null);
  return r?.ok ? r : (local ?? new Response(null, { status: 404 }));
}

/** the list of flights: deployed list merged with the operator's newer one (newest first) */
export async function flightIndex(): Promise<FlightIndexEntry[]> {
  const [a, b] = await Promise.all([
    fetch("/data/flights/index.json").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    remoteOk() ? remote("index.json").then((r) => (r.ok ? r.json() : [])).catch(() => []) : Promise.resolve([]),
  ]);
  const byId = new Map<string, FlightIndexEntry>();
  for (const f of [...(a as FlightIndexEntry[]), ...(b as FlightIndexEntry[])]) byId.set(f.flightId, f);
  if (!byId.size) throw new Error("no flights published");
  return [...byId.values()].sort((x, y) => (y.startedAt ?? 0) - (x.startedAt ?? 0));
}
