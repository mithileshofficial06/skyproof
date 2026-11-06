// Ported from ozky: monochrome line graphics (currentColor).
import type { ReactNode } from "react";

const Svg = ({ className, children }: { className?: string; children: ReactNode }) => (
  <svg viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
    {children}
  </svg>
);

export const Tetra = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <g stroke="currentColor" strokeWidth="1.1">
      <path d="M100 20 L20 165 L180 165 Z" />
      <path d="M100 20 L100 120 M20 165 L100 120 L180 165" />
      <path d="M100 120 L60 92 M100 120 L140 92" opacity="0.6" />
      <path d="M60 92 L140 92" opacity="0.4" />
    </g>
  </Svg>
);

export const Globe = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <g stroke="currentColor" strokeWidth="1">
      <circle cx="100" cy="100" r="80" />
      <ellipse cx="100" cy="100" rx="80" ry="28" />
      <ellipse cx="100" cy="100" rx="80" ry="56" />
      <ellipse cx="100" cy="100" rx="28" ry="80" />
      <ellipse cx="100" cy="100" rx="56" ry="80" />
      <line x1="20" y1="100" x2="180" y2="100" />
      <line x1="100" y1="20" x2="100" y2="180" />
    </g>
  </Svg>
);

const RAYS = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2;
  return { x: 100 + Math.cos(a) * 88, y: 100 + Math.sin(a) * 88 };
});
export const Starburst = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <g stroke="currentColor" strokeWidth="0.9">
      {RAYS.map((l) => (
        <line key={`${l.x}-${l.y}`} x1="100" y1="100" x2={l.x} y2={l.y} />
      ))}
    </g>
  </Svg>
);

const DOTS: { x: number; y: number; r: number }[] = [];
for (let gx = 0; gx < 26; gx++)
  for (let gy = 0; gy < 26; gy++) {
    const x = (gx + 0.5) * (200 / 26);
    const y = (gy + 0.5) * (200 / 26);
    const d = Math.hypot(x - 100, y - 100);
    if (d > 95) continue;
    DOTS.push({ x, y, r: Math.max(0.2, 3.4 * (1 - Math.abs(d - 52) / 52)) });
  }
export const Halftone = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden>
    {DOTS.map((d) => (
      <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={d.r} fill="currentColor" />
    ))}
  </svg>
);

export const GRAPHICS = { tetra: Tetra, globe: Globe, halftone: Halftone, starburst: Starburst };
