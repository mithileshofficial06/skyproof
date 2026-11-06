// Site-wide smooth scroll + scroll-triggered reveals (Lenis + GSAP), ported from the ozky web UI.
// GSAP playback is held until the initial loader lifts, so intro tweens play on reveal instead of behind it.
// /experience runs its own Lenis (ScrollProvider), so the global one is skipped there.
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenis: Lenis | null = null;
let released = false;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.globalTimeline.pause();
}

export function releaseAnimations(): void {
  if (released) return;
  released = true;
  if (typeof window !== "undefined") gsap.globalTimeline.resume();
}

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const getLenis = () => lenis;

/** Boot Lenis on GSAP's ticker. Inner scroll areas (feeds, tables) keep native scrolling. Returns a teardown. */
export function initScroll(): () => void {
  if (typeof window === "undefined" || reducedMotion()) return () => {};
  lenis = new Lenis({
    lerp: 0.1,
    prevent: (node: HTMLElement) => !!node.closest?.("[data-lenis-prevent], .overflow-auto, .overflow-y-auto, .overflow-x-auto, canvas, select, textarea"),
  });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (t: number) => lenis?.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

export { gsap, ScrollTrigger };
