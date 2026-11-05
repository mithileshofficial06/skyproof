// Officer service: the drone's flight computer asks here before every mission command.
// Order: permit + hard rules -> simulated person detector -> 0G vision decision -> combine -> record.
// If 0G can't be reached the answer is NO_DECISION. A decision is never made up.
import { createHash, randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { ethers } from "ethers";
import { need } from "./env.js";
import { loadPermit } from "./permit.js";
import { checkHardRules, type Cmd, type DroneState } from "./rules.js";
import { zgDecide, ZgUnreachable, PROMPT_HASH } from "./zg.js";
import { FlightRecorder } from "./record.js";

const PORT = Number(process.env.OFFICER_PORT || 8787);
const STATE_BATCH_MS = 5000;

const { permit, permitHash } = loadPermit();
const signer = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY?.trim() || need("DEPLOYER_PRIVATE_KEY"));

interface Session {
  rec: FlightRecorder;
  netDown: boolean;
  samples: DroneState[];
  lastBatch: number;
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
  return { type: "decision", nonce: req.nonce, requestHash, verdict, code, reason, source, decisionHash: record.hash, zgRequestId: zg?.zgRequestId ?? null };
}

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws: WebSocket) => {
  let s: Session | null = null;
  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());
    try {
      switch (msg.type) {
        case "hello": {
          const flightId = `${permit.airframeId}-${msg.scenario}-${Date.now()}`;
          s = { rec: new FlightRecorder(flightId, signer), netDown: false, samples: [], lastBatch: Date.now() };
          s.rec.append("PERMIT", { permitHash, permit, signer: signer.address, visionModel: process.env.ZG_VISION_MODEL, promptHash: PROMPT_HASH, scenario: msg.scenario });
          log(`flight ${flightId} opened (record signer ${signer.address})`);
          ws.send(JSON.stringify({ type: "hello", flightId, permitHash }));
          break;
        }
        case "request":
          ws.send(JSON.stringify(await decide(s!, msg)));
          break;
        case "telemetry":
          s!.samples.push(msg.state);
          if (Date.now() - s!.lastBatch >= STATE_BATCH_MS) flushState(s!);
          break;
        case "action":
          flushState(s!);
          s!.rec.append("ACTION", { cmd: msg.cmd, decisionHash: msg.decisionHash ?? null, state: msg.state });
          log(`ACTION  ${msg.cmd.type} executed${msg.decisionHash ? "" : "  ** WITHOUT an approved decision **"}`);
          break;
        case "safe_stop":
          flushState(s!);
          s!.rec.append("SAFE_STOP_LOCAL", { step: msg.step, detail: msg.detail, note: "pre-approved local policy, no 0G decision claimed" });
          log(`SAFE_STOP_LOCAL ${msg.step}: ${msg.detail}`);
          break;
        case "override":
          flushState(s!);
          s!.rec.append("OVERRIDE", { detail: msg.detail });
          log(`OVERRIDE ${msg.detail}`);
          break;
        case "control":
          s!.netDown = msg.network === "down";
          log(`link to 0G is now ${s!.netDown ? "DOWN" : "UP"}`);
          break;
        case "close":
          flushState(s!);
          s!.rec.append("CLOSE", { finalState: msg.state });
          log(`flight closed: ${s!.rec.seq} records, head ${s!.rec.head}\n         file ${s!.rec.file}`);
          ws.send(JSON.stringify({ type: "closed", records: s!.rec.seq, head: s!.rec.head, file: s!.rec.file }));
          break;
      }
    } catch (e) {
      log("error:", (e as Error).message);
      ws.send(JSON.stringify({ type: "error", id: randomUUID(), message: (e as Error).message }));
    }
  });
});
log(`officer listening on ws://localhost:${PORT}  model ${process.env.ZG_VISION_MODEL}  permit ${permitHash.slice(0, 18)}…`);
