// Demo control for the hosted site: a visitor can start one simulated flight at a time.
// Safety: a fixed list of scenarios (never a typed command), one flight at a time, a daily cap, an optional passcode
// (DEMO_PASSCODE, compared in constant time, with a brute-force limit), and a per-run drone token so only the simulator this machine starts
// (or one started by hand here, which reads .tmp/drone.token) can act as the drone.
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SCENARIOS = ["normal", "people_below", "network_down", "geofence_breach", "blocked", "full"] as const;

const TMP = fileURLToPath(new URL("../.tmp/", import.meta.url));
const SIM = fileURLToPath(new URL("../../sim/", import.meta.url));
mkdirSync(TMP, { recursive: true });

/** fresh every officer start; a simulator must present it in its hello */
export const DRONE_TOKEN = randomBytes(24).toString("hex");
writeFileSync(`${TMP}drone.token`, DRONE_TOKEN);

const PASS = process.env.DEMO_PASSCODE?.trim() ?? "";
const MAX_PER_DAY = Math.max(1, Number(process.env.DEMO_MAX_FLIGHTS || 30));
const MAX_RUN_MS = 6 * 60_000;
/** starting flights from the website is on unless DEMO_START=off; a passcode is only asked for if DEMO_PASSCODE is set */
export const startEnabled = (process.env.DEMO_START ?? "on").trim().toLowerCase() !== "off";
export const passRequired = PASS.length > 0;

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const tokenOk = (t: unknown) => typeof t === "string" && same(t, DRONE_TOKEN);

// brute-force guard: at most 10 wrong passcodes per 10 minutes across all visitors
let wrong: number[] = [];
export function passOk(p: unknown): { ok: boolean; why?: string } {
  if (!startEnabled) return { ok: false, why: "Starting flights from the website is turned off on this computer." };
  if (!passRequired) return { ok: true };
  const now = Date.now();
  wrong = wrong.filter((t) => now - t < 10 * 60_000);
  if (wrong.length >= 10) return { ok: false, why: "Too many wrong passcodes. Try again in a few minutes." };
  if (typeof p === "string" && same(p.trim(), PASS)) return { ok: true };
  wrong.push(now);
  return { ok: false, why: "Wrong passcode." };
}

const COUNT = `${TMP}demo-starts.json`;
const today = () => new Date().toISOString().slice(0, 10);
export function startsLeft(): number {
  try {
    const j = JSON.parse(readFileSync(COUNT, "utf8"));
    return j.day === today() ? Math.max(0, MAX_PER_DAY - j.n) : MAX_PER_DAY;
  } catch {
    return MAX_PER_DAY;
  }
}
const countStart = () => writeFileSync(COUNT, JSON.stringify({ day: today(), n: MAX_PER_DAY - startsLeft() + 1 }));

let child: ChildProcess | null = null;
let running: { scenario: string; since: number } | null = null;
export const simStatus = () => ({ running: !!child, scenario: running?.scenario ?? null, since: running?.since ?? null, startEnabled, passRequired, startsLeft: startsLeft() });

/** start the PyBullet simulator for one fixed scenario; returns an error message or null */
export function startSim(scenario: string, log: (...a: unknown[]) => void, onExit: (code: number | null) => void): string | null {
  if (!(SCENARIOS as readonly string[]).includes(scenario)) return "Unknown scenario.";
  if (child) return "A flight is already running. Please wait for it to land.";
  if (startsLeft() <= 0) return "Today's demo limit is reached.";
  const py = process.platform === "win32" ? `${SIM}.venv/Scripts/python.exe` : `${SIM}.venv/bin/python`;
  if (!existsSync(py)) return "The simulator is not installed on this computer.";
  countStart();
  const p = spawn(py, ["mission.py", "--scenario", scenario, "--realtime"], {
    cwd: SIM,
    env: { ...process.env, SKYPROOF_DRONE_TOKEN: DRONE_TOKEN, PYTHONUNBUFFERED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child = p;
  running = { scenario, since: Date.now() };
  log(`(website) started a ${scenario} flight · ${startsLeft()} demo starts left today`);
  const relay = (d: Buffer) =>
    d
      .toString()
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .forEach((l) => log(`  sim | ${l.slice(0, 200)}`));
  p.stdout?.on("data", relay);
  p.stderr?.on("data", relay);
  const stop = setTimeout(() => p.kill(), MAX_RUN_MS);
  const done = (code: number | null) => {
    clearTimeout(stop);
    if (child !== p) return;
    child = null;
    running = null;
    onExit(code);
  };
  p.on("exit", done);
  p.on("error", (e) => {
    log(`simulator failed to start: ${e.message}`);
    done(-1);
  });
  return null;
}
