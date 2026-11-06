// Officer service: the drone's flight computer asks here before every mission command.
// Order: permit + hard rules -> simulated person detector -> 0G vision decision -> combine -> record.
// If 0G can't be reached the answer is NO_DECISION. A decision is never made up.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { ethers } from "ethers";
import { need } from "./env.js";
import { loadPermit } from "./permit.js";
import { checkHardRules, vetoOption, type Cmd, type DroneState, type Situation } from "./rules.js";
import { zgDecide, zgChoose, ZgUnreachable, PROMPT_HASH, SITUATION_PROMPT_HASH } from "./zg.js";
import { FlightRecorder } from "./record.js";
import { FlightSealer } from "./sealer.js";
import { operatorWallet, loadDeployment } from "./chain.js";

const PORT = Number(process.env.OFFICER_PORT || 8787);
const STATE_BATCH_MS = 5000;

const { permit, permitHash } = loadPermit();
const signer = operatorWallet(); // signs records; the same key anchors them on 0G Chain
const ONCHAIN = process.env.SKYPROOF_ONCHAIN !== "0" && loadDeployment() !== null;

interface Session {
  rec: FlightRecorder;
  sealer: FlightSealer | null;
  netDown: boolean;
  samples: DroneState[];
  lastBatch: number;
  lastKept: number;
}

function log(...a: unknown[]) {
  console.log(new Date().toISOString().slice(11, 19), ...a);
}

function flushState(s: Session) {
  if (s.samples.length === 0) return;
  s.rec.append("STATE", { samples: s.samples });
  s.samples = [];
  s.lastBatch = Date.now();
}

async function decide(s: Session, msg: any) {
  const requestHash = "0x" + createHash("sha256").update(msg.body).digest("hex");
  const req = JSON.parse(msg.body) as { nonce: string; cmd: Cmd; state: DroneState; peopleInZone?: number };
  const { cmd, state } = req;

  const hard = checkHardRules(permit, cmd, state);
  let verdict: "ALLOW" | "DENY" | "NO_DECISION";
  let code: string;
  let reason: string;
  let source: string;
  let zg: any = null;

  if (hard.code !== "OK") {
    [verdict, code, reason, source] = ["DENY", hard.code, hard.detail, "HARD_RULES"];
  } else {
    try {
      zg = await zgDecide(cmd, state, msg.frame, s.netDown);
      [verdict, code, reason, source] = [zg.verdict, zg.code, zg.reason, "0G"];
      // The independent person detector can only make the answer stricter.
      if (verdict === "ALLOW" && (cmd.type === "DROP" || cmd.type === "LAND") && (req.peopleInZone ?? 0) > 0)
        [verdict, code, reason, source] = ["DENY", "PEOPLE_BELOW", `0G allowed, but detector sees ${req.peopleInZone} person(s)`, "0G+DETECTOR"];
    } catch (e) {
      if (!(e instanceof ZgUnreachable)) throw e;
      [verdict, code, reason, source] = ["NO_DECISION", "ZG_UNREACHABLE", (e as Error).message, "NONE"];
    }
  }

  const frameHash = msg.frame ? "0x" + createHash("sha256").update(msg.frame).digest("hex") : null;
  const record = s.rec.append("DECISION", {
    nonce: req.nonce,
    requestHash,
    request: req,
    frameHash,
    verdict,
    code,
    reason,
    source,
    zg: zg && { requestId: zg.zgRequestId, provider: zg.provider, model: zg.model, latencyMs: zg.latencyMs, promptHash: PROMPT_HASH },
  });
  log(`${cmd.type.padEnd(7)} -> ${verdict.padEnd(11)} ${code.padEnd(14)} [${source}] ${zg?.zgRequestId ?? ""} ${zg ? zg.latencyMs + "ms" : ""} ${reason}`);
  return { type: "decision", nonce: req.nonce, requestHash, verdict, code, reason, source, decisionHash: record.hash, zgRequestId: zg?.zgRequestId ?? null, recordSeq: record.seq, latencyMs: zg?.latencyMs ?? null };
}

async function choose(s: Session, msg: any) {
  const requestHash = "0x" + createHash("sha256").update(msg.body).digest("hex");
  const req = JSON.parse(msg.body) as { nonce: string; situation: Situation; state: DroneState };
  const { situation, state } = req;
  const vetoed: { id: string; why: string }[] = [];
  const legal = situation.options.filter((o) => {
    const why = vetoOption(permit as any, o, state);
    if (why) vetoed.push({ id: o.id, why });
    return !why;
  });

  let verdict: "ALLOW" | "NO_DECISION" = "NO_DECISION";
  let choice: string | null = null;
  let reason = "";
  let source = "NONE";
  let zg: any = null;
  if (legal.length === 0) {
    reason = "every option breaks the permit";
  } else {
    try {
      zg = await zgChoose(situation.kind, situation.detail, legal, state, msg.frame, s.netDown);
      if (zg.choice) [verdict, choice, reason, source] = ["ALLOW", zg.choice, zg.reason, "0G"];
      else reason = `0G answer was not one of the legal options (${zg.reason})`;
    } catch (e) {
      if (!(e instanceof ZgUnreachable)) throw e;
      reason = (e as Error).message;
    }
  }

  const frameHash = msg.frame ? "0x" + createHash("sha256").update(msg.frame).digest("hex") : null;
  const record = s.rec.append("DECISION", {
    kind: "SITUATION",
    nonce: req.nonce,
    requestHash,
    request: req,
    frameHash,
    legal: legal.map((o) => o.id),
    vetoed,
    verdict,
    choice,
    reason,
    source,
    zg: zg && { requestId: zg.zgRequestId, provider: zg.provider, model: zg.model, latencyMs: zg.latencyMs, promptHash: zg.promptHash },
  });
  log(`${situation.kind.padEnd(17)} -> ${(choice ?? verdict).padEnd(12)} [${source}] ${zg?.zgRequestId ?? ""} ${zg ? zg.latencyMs + "ms" : ""} ${reason}${vetoed.length ? `  (vetoed: ${vetoed.map((v) => v.id).join(", ")})` : ""}`);
  return { type: "choice", nonce: req.nonce, requestHash, verdict, choice, code: choice ?? "NO_DECISION", reason, source, vetoed, legal: legal.map((o) => o.id), decisionHash: record.hash, zgRequestId: zg?.zgRequestId ?? null , recordSeq: record.seq, latencyMs: zg?.latencyMs ?? null };
}

// Live watchers (the web mission console). They see everything the recorder sees.
const watchers = new Set<WebSocket>();
let lastSession: Session | null = null;
function broadcast(msg: unknown) {
  const text = JSON.stringify(msg);
  for (const w of watchers) if (w.readyState === w.OPEN) w.send(text);
}

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws: WebSocket) => {
  let s: Session | null = null;
  ws.on("close", () => watchers.delete(ws));
  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());
    try {
      if (msg.type === "watch") {
        watchers.add(ws);
        ws.send(JSON.stringify({ type: "watching", flightId: lastSession?.rec.flightId ?? null, permit, permitHash }));
        return;
      }
      if (msg.type === "control" && watchers.has(ws)) {
        if (lastSession) lastSession.netDown = msg.network === "down";
        log(`(console) link to 0G is now ${msg.network === "down" ? "DOWN" : "UP"}`);
        broadcast({ type: "control", network: msg.network });
        return;
      }
      switch (msg.type) {
        case "hello": {
          const flightId = `${permit.airframeId}-${msg.scenario}-${Date.now()}`;
          s = { rec: new FlightRecorder(flightId, signer), sealer: null, netDown: false, samples: [], lastBatch: Date.now(), lastKept: -1 };
          s.rec.append("PERMIT", { permitHash, permit, signer: signer.address, visionModel: process.env.ZG_VISION_MODEL, promptHash: PROMPT_HASH, situationPromptHash: SITUATION_PROMPT_HASH, scenario: msg.scenario });
          if (ONCHAIN) {
            s.sealer = new FlightSealer(s.rec, permit.airframeId, permitHash, log);
            s.sealer.onOpen = (openTx) => broadcast({ type: "opened", flightId, openTx });
            s.sealer.onSeal = (seg) => broadcast({ type: "sealed", flightId, ...seg });
          }
          lastSession = s;
          broadcast({ type: "flight", flightId, scenario: msg.scenario, permitHash, chainFlightId: s.sealer?.manifest.chainFlightId ?? null });
          log(`flight ${flightId} opened (record signer ${signer.address})`);
          ws.send(JSON.stringify({ type: "hello", flightId, permitHash }));
          break;
        }
        case "request": {
          const d = await decide(s!, msg);
          ws.send(JSON.stringify(d));
          broadcast({ ...d, type: "decision", request: JSON.parse(msg.body), frame: msg.frame ?? null });
          break;
        }
        case "situation": {
          const c = await choose(s!, msg);
          ws.send(JSON.stringify(c));
          broadcast({ ...c, type: "choice", request: JSON.parse(msg.body), frame: msg.frame ?? null });
          break;
        }
        case "scene":
          s!.rec.append("SCENE", { event: msg.event, props: msg.props, people: msg.people });
          broadcast({ type: "scene", event: msg.event, props: msg.props, people: msg.people });
          break;
        case "event":
          s!.rec.append("EVENT", { event: msg.event });
          broadcast({ type: "event", event: msg.event });
          break;
        case "telemetry":
          broadcast({ type: "telemetry", state: msg.state });
          if (msg.state.t - s!.lastKept >= 0.45) {
            s!.samples.push(msg.state); // the black box keeps ~2 Hz; the live view gets every sample
            s!.lastKept = msg.state.t;
          }
          if (Date.now() - s!.lastBatch >= STATE_BATCH_MS) flushState(s!);
          break;
        case "action":
          flushState(s!);
          s!.rec.append("ACTION", { cmd: msg.cmd, decisionHash: msg.decisionHash ?? null, state: msg.state });
          broadcast({ type: "action", cmd: msg.cmd, approved: !!msg.decisionHash, state: msg.state });
          log(`ACTION  ${msg.cmd.type}${msg.cmd.choice ? " " + msg.cmd.choice : ""} executed${msg.decisionHash ? "" : "  ** WITHOUT an approved decision **"}`);
          break;
        case "safe_stop":
          flushState(s!);
          s!.rec.append("SAFE_STOP_LOCAL", { step: msg.step, detail: msg.detail, note: "pre-approved local policy, no 0G decision claimed" });
          broadcast({ type: "safe_stop", step: msg.step, detail: msg.detail });
          log(`SAFE_STOP_LOCAL ${msg.step}: ${msg.detail}`);
          break;
        case "override":
          flushState(s!);
          s!.rec.append("OVERRIDE", { detail: msg.detail });
          log(`OVERRIDE ${msg.detail}`);
          break;
        case "control":
          s!.netDown = msg.network === "down";
          broadcast({ type: "control", network: msg.network });
          log(`link to 0G is now ${s!.netDown ? "DOWN" : "UP"}`);
          break;
        case "close":
          flushState(s!);
          s!.rec.append("CLOSE", { finalState: msg.state });
          log(`flight closed: ${s!.rec.seq} records, head ${s!.rec.head}\n         file ${s!.rec.file}`);
          ws.send(JSON.stringify({ type: "closed", records: s!.rec.seq, head: s!.rec.head, file: s!.rec.file, sealing: !!s!.sealer }));
          broadcast({ type: "closed", flightId: s!.rec.flightId, records: s!.rec.seq, chainFlightId: s!.sealer?.manifest.chainFlightId ?? null });
          s!.sealer?.finish().then((m) => {
            if (!m.closed) return;
            // publish the sealed flight to the website (rebuilt from 0G, like the replay)
            const p = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "src/export-web.ts"], { cwd: fileURLToPath(new URL("..", import.meta.url)) });
            p.on("exit", (code) => {
              log(code === 0 ? `website: flight ${m.flightId} published` : `website export failed (code ${code})`);
              if (code === 0) {
                broadcast({ type: "published", flightId: m.flightId });
                // plain-English summary for insurers / newcomers, next to the published flight
                spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "src/flight-summary.ts", m.flightId], { cwd: fileURLToPath(new URL("..", import.meta.url)) }).on("exit", (c) =>
                  log(c === 0 ? `summary written: reports/flights/${m.flightId}.txt` : `summary failed (code ${c})`),
                );
              }
            });
          });
          break;
      }
    } catch (e) {
      log("error:", (e as Error).message);
      ws.send(JSON.stringify({ type: "error", id: randomUUID(), message: (e as Error).message }));
    }
  });
});
log(`officer listening on ws://localhost:${PORT}  model ${process.env.ZG_VISION_MODEL}  permit ${permitHash.slice(0, 18)}  0G sealing ${ONCHAIN ? "ON" : "OFF"}  operator ${signer.address}`);
