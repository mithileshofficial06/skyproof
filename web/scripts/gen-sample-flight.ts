// Builds public/data/sample-flight.json from a real sealed flight (specs/05a D1), so /experience works offline.
// Picks the newest intact "full" flight unless an id is given, and refuses to write it unless the rebuilt
// chain equals the sealed fingerprints and the 0G Chain anchors.
//   pnpm gen:sample [flightId]
import { readFileSync, writeFileSync } from "node:fs";
import { verify } from "../src/lib/data/hash";
import type { Hex } from "../src/lib/data/types";
import type { FlightFile, FlightIndexEntry } from "../src/lib/flight";

const DIR = new URL("../public/data/", import.meta.url);
const index: FlightIndexEntry[] = JSON.parse(readFileSync(new URL("flights/index.json", DIR), "utf8"));
const id = process.argv[2] ?? index.filter((f) => f.scenario === "full" && f.intact).sort((a, b) => b.startedAt - a.startedAt)[0]?.flightId;
if (!id) throw new Error("no intact full flight in the index");

const flight: FlightFile = JSON.parse(readFileSync(new URL(`flights/${id}.json`, DIR), "utf8"));
const v = verify(flight.records, flight.records.map((r) => r.hash as Hex), flight.anchors.map((a) => ({ seq: a.seq, head: a.head as Hex })));
if (!v.ok) throw new Error(`${id} does not verify (first bad record ${v.firstBad}, bad anchor ${v.badAnchorSeq})`);

writeFileSync(new URL("sample-flight.json", DIR), JSON.stringify(flight));
console.log(`sample-flight.json <- ${id}: ${flight.records.length} records, ${flight.anchors.length} anchors, chain verified`);
