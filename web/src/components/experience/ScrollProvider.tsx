"use client";
// Smooth scroll (specs/05-uiux.md 7.2): Lenis on GSAP's ticker, feeding scroll progress (0..1) into the store.
// With reduced motion, native scrolling only.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { type ReactNode, useEffect } from "react";
import { prefersReducedMotion } from "@/lib/quality";
import { useUI } from "@/lib/store";

export function ScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (prefersReducedMotion()) {
      const on = () => useUI.getState().setScroll(window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));
      window.addEventListener("scroll", on, { passive: true });
      on();
      return () => window.removeEventListener("scroll", on);
    }
    const lenis = new Lenis({ lerp: 0.1 });
    const off = lenis.on("scroll", (l) => {
      ScrollTrigger.update();
      useUI.getState().setScroll(l.progress);
    });
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      off();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return <>{children}</>;
}
