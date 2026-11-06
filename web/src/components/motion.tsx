"use client";
// Small motion helpers: reveal on scroll, count up when seen. CSS does the animating (globals.css),
// so reduced-motion users get the final state immediately.
import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef, useState } from "react";

export function useInView<T extends Element>(once = true, margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) setSeen(false);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, margin]);
  return [ref, seen] as const;
}

export function Reveal({ children, delay = 0, from = "up", as: Tag = "div", className = "", style }: { children: ReactNode; delay?: number; from?: "up" | "left"; as?: ElementType; className?: string; style?: CSSProperties }) {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={`${from === "left" ? "reveal-l" : "reveal"} ${seen ? "in" : ""} ${className}`} style={{ ...style, ["--d" as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Counts from 0 to `to` once it scrolls into view. */
export function CountUp({ to, ms = 1400, format = (n: number) => Math.round(n).toLocaleString() }: { to: number; ms?: number; format?: (n: number) => string }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, ms]);
  return <span ref={ref}>{format(v)}</span>;
}
