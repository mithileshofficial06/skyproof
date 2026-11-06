// Motion maths for /experience (specs/05-uiux.md 6.4, 6.5).
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** frame-rate independent exponential damping: x + (target - x)(1 - e^(-lambda dt)) */
export const damp = (x: number, target: number, lambda: number, dt: number) => x + (target - x) * (1 - Math.exp(-lambda * dt));

/** critically damped spring (no overshoot), Game Programming Gems 4 form */
export function smoothDamp(cur: number, target: number, vel: { v: number }, smoothTime: number, dt: number) {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * e;
  let out = target + (change + temp) * e;
  if (target - cur > 0 === out > target) {
    out = target;
    vel.v = 0;
  }
  return out;
}
