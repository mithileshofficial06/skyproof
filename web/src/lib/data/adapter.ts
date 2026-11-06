// The only door between /experience and flight data (CLAUDE.md UI rules).
import { liveSource } from "./live";
import { replaySource } from "./replay";
import type { FlightSource } from "./types";

export const source: FlightSource = process.env.NEXT_PUBLIC_DATA_MODE === "live" ? liveSource : replaySource;
