"use client";
// Ported from ozky: a grid of rune glyphs, each flipping to a new random rune on its own 0.5–3 s schedule
// (with a fade), masked to grey with an occasional gold cell. Decorative only.
import { useEffect, useState } from "react";

const RUNES = ["sym_back_c", "sym_circle", "sym_circle_in_circle", "sym_circle_v_line", "sym_circle_x_sq", "sym_cross_v", "sym_curved_x_line", "sym_half_e", "sym_hash", "sym_hourglass", "sym_line_arcs", "sym_psi", "sym_semicircle", "sym_sq_in_sq", "sym_square", "sym_topline_inv_v", "sym_v_cross_line", "sym_v_doublecross_line", "sym_window"];
type Cell = { r: string; o: number; g: boolean; k: number };
const make = (k: number): Cell => ({ r: RUNES[(Math.random() * RUNES.length) | 0], o: 0.28 + Math.random() * 0.38, g: Math.random() < 0.12, k });

export function RuneGlitch({ fill = false, cell = 16, gap = 7, runeSize = 14 }: { fill?: boolean; cell?: number; gap?: number; runeSize?: number }) {
  const [cells, setCells] = useState<Cell[]>([]);
  useEffect(() => {
    let count = 160;
    if (fill) {
      const pitch = cell + gap;
      count = Math.min(Math.ceil(window.innerWidth / pitch) * Math.ceil(window.innerHeight / pitch) + Math.ceil(window.innerWidth / pitch), 800);
    }
    setCells(Array.from({ length: count }, (_, i) => make(i)));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let k = count;
    const schedule = (i: number) => {
      timers[i] = setTimeout(() => {
        setCells((c) => {
          if (!c[i]) return c;
          const n = c.slice();
          n[i] = make(k++);
          return n;
        });
        schedule(i);
      }, 500 + Math.random() * 2500);
    };
    for (let i = 0; i < count; i++) schedule(i);
    return () => timers.forEach(clearTimeout);
  }, [fill, cell, gap]);

  return (
    <div
      aria-hidden
      className="pointer-events-none grid overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${cell}px, 1fr))`,
        gridAutoRows: `${cell}px`,
        gap,
        ...(fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", justifyContent: "center", alignContent: "center" } : { maxHeight: 8 * cell + 7 * gap }),
      }}
    >
      {cells.map((c, i) => (
        <span key={i} className="relative grid place-items-center">
          <span
            key={c.k}
            className="oz-rune absolute"
            style={{
              width: runeSize,
              height: runeSize,
              opacity: c.o,
              background: c.g ? "var(--color-gold)" : "var(--color-grey)",
              WebkitMask: `url(/oz/runes/${c.r}.svg) center / contain no-repeat`,
              mask: `url(/oz/runes/${c.r}.svg) center / contain no-repeat`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
