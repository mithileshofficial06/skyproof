// Shared state for /experience (specs/05-uiux.md 7.1). The 3D scene and the DOM talk only through this store.
// In useFrame read with useUI.getState() (no re-renders); in DOM components use selectors.
import { create } from "zustand";
import type { FlightRecord } from "./data/types";

export type Verdict = "idle" | "pending" | "pass" | "fail";
export type Mode = "live" | "replay" | "sandbox";
export type Quality = "high" | "medium" | "low";

interface UI {
  scroll: number;
  mode: Mode;
  verdict: Verdict;
  quality: Quality;
  tamperIndex: number | null;
  tamperDelta: number;
  tamperClock: number | null; // start time (s) of the hash cascade
  flight: FlightRecord | null; // the sealed flight shown by Two Truths (from the data adapter)
  setFlight: (f: FlightRecord | null) => void;
  setScroll: (v: number) => void;
  setMode: (m: Mode) => void;
  setVerdict: (v: Verdict) => void;
  setQuality: (q: Quality) => void;
  startTamper: (i: number, delta: number) => void;
  resetTamper: () => void;
}

export const useUI = create<UI>((set) => ({
  scroll: 0,
  mode: "replay",
  verdict: "idle",
  quality: "high",
  tamperIndex: null,
  tamperDelta: 0,
  tamperClock: null,
  flight: null,
  setFlight: (flight) => set({ flight }),
  setScroll: (scroll) => set({ scroll }),
  setMode: (mode) => set({ mode }),
  setVerdict: (verdict) => set({ verdict }),
  setQuality: (quality) => set({ quality }),
  startTamper: (tamperIndex, tamperDelta) => set({ tamperIndex, tamperDelta, tamperClock: performance.now() / 1000 }),
  resetTamper: () => set({ tamperIndex: null, tamperDelta: 0, tamperClock: null, verdict: "idle" }),
}));
