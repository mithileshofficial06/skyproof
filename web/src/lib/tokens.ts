// Design tokens for /experience (specs/05-uiux.md, Section 9). The same values are exposed to Tailwind as
// `x-*` colours in globals.css; 3D code reads them from here because three needs real colour values.
export const X = {
  bg: "#05070a",
  surface: "#0b0f14",
  surface2: "#111821",
  text: "#e6edf3",
  muted: "#8b98a5",
  cyan: "#22d3ee",
  amber: "#f5a524",
  danger: "#ff3b30",
  pass: "#22c55e",
  capsule: "#ff6a00",
  zg: "#7c5cff",
  chainlink: "#375bd2",
  arc: "#0e8ea0",
  grid: "#123744",
  gridSub: "#0a1a21",
} as const;

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
