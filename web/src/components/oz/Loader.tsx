"use client";
// Ported from ozky: initial-load cover. Ink screen, full-screen rune glitch, load % in all four corners, and the
// wordmark acting as a grey → gold loading bar. rAF-driven (GSAP is paused until this lifts); on finish it releases
// GSAP so the page's intro tweens play on reveal.
import { useEffect, useState } from "react";
import { releaseAnimations } from "@/lib/ozScroll";
import { RuneGlitch } from "./RuneGlitch";

export function Loader({ onComplete }: { onComplete: () => void }) {
  const [pct, setPct] = useState(0);
  const [hiding, setHiding] = useState(false);
  useEffect(() => {
    const DUR = 1300;
    const start = performance.now();
    let raf = 0;
    let done = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        releaseAnimations();
        setHiding(true);
        done = window.setTimeout(onComplete, 550);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [onComplete]);

  const corner = "mono pointer-events-none absolute text-[12px] text-gold";
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-ink transition-opacity duration-500 ${hiding ? "pointer-events-none opacity-0" : ""}`} role="progressbar" aria-valuenow={pct} aria-label="Loading SkyProof">
      <RuneGlitch fill cell={42} gap={16} runeSize={26} />
      <span className={`${corner} left-6 top-6`}>{pct}%</span>
      <span className={`${corner} right-6 top-6`}>{pct}%</span>
      <span className={`${corner} bottom-6 left-6`}>{pct}%</span>
      <span className={`${corner} bottom-6 right-6`}>{pct}%</span>
      {/* wordmark as a colour-fill loading bar (grey → gold, left → right) */}
      <div className="relative select-none font-display font-semibold leading-none tracking-[-0.05em]" style={{ fontSize: "clamp(3.5rem, 13vw, 10rem)" }}>
        <span className="text-grey">SkyProof</span>
        <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-gold" style={{ width: `${pct}%` }}>
          SkyProof
        </span>
      </div>
    </div>
  );
}
