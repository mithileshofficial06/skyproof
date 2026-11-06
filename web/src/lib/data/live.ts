// live: the published flight plus anchors read from 0G Chain right now (specs/05a D12).
// Fully wired in UI-9; until then it falls back to replay and says so through `source`.
import { replaySource } from "./replay";
import type { FlightSource } from "./types";

export const liveSource: FlightSource = {
  async load(id) {
    return replaySource.load(id); // [UI-9] read FlightLog.getAnchors on 0G Galileo and claims on Arc
  },
};
