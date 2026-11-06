// Quality tiers (specs/05-uiux.md 6.17, 9 Responsive): small screens and touch devices start at "low".
import type { Quality } from "./store";

export function initialQuality(): Quality {
  if (typeof window === "undefined") return "high";
  const small = window.innerWidth < 768;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return small || coarse ? "low" : "high";
}

export const step = (q: Quality): Quality => (q === "high" ? "medium" : "low");

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** true when the browser can create a WebGL context at all */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
