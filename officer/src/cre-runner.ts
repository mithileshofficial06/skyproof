// Automatic Chainlink judge for the demo: nobody types the CRE command.
//  1. watches SkyProofEscrow on Arc for ClaimWindowClosed
//  2. runs the CRE workflow (simulation, broadcast to Arc) on that exact event, one at a time
//  3. optional: closes claim windows that have ended (anyone may call closeClaimWindow), so a claim never waits on a click
// The workflow itself is unchanged: this only does what a person would type, and only for real events on Arc.
//   pnpm cre-runner
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { ethers } from "ethers";
import { arcProvider, CLAIM_STATES, escrow, escrowAddress } from "./arc.js";

const JUDGE_DIR = fileURLToPath(new URL("../../cre/judge/", import.meta.url));
const TMP = fileURLToPath(new URL("../.tmp/", import.meta.url));
const STATE_FILE = `${TMP}cre-runner.json`;
const POLL_MS = 6000;
const LOOKBACK = 6000; // blocks scanned on first start
const CHUNK = 2000;
const CLOSE_GRACE_S = 20; // let the victim press the button first

mkdirSync(TMP, { recursive: true });
config({ path: `${JUDGE_DIR}.env`, quiet: true }); // CRE_ETH_PRIVATE_KEY: the key the CRE simulation broadcasts with

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const CRE = process.env.CRE_BIN || "cre";
const ticketKey = process.env.CRE_ETH_PRIVATE_KEY?.trim();
const closer = ticketKey ? new ethers.Wallet(ticketKey.startsWith("0x") ? ticketKey : `0x${ticketKey}`, arcProvider) : null;

interface State {
  lastBlock: number;
  judged: Record<string, { claimId: number; at: string; verdict: string }>;
  open: number[]; // claims seen opened and not yet closed
}
const state: State = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : { lastBlock: 0, judged: {}, open: [] };
state.open ??= [];
const save = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));

const E = escrow();
const TOPIC_OPENED = E.interface.getEvent("ClaimOpened")!.topicHash;
const TOPIC_CLOSED = E.interface.getEvent("ClaimWindowClosed")!.topicHash;
const VERDICT = ["pending", "BREACH (paid)", "REVIEW (held for insurer)"];

function runCre(txHash: string, eventIndex: number): Promise<{ ok: boolean; out: string }> {
  const args = ["workflow", "simulate", "verdict", "--non-interactive", "--trigger-index", "0", "--evm-tx-hash", txHash, "--evm-event-index", String(eventIndex), "--broadcast", "-T", "staging-settings"];
  return new Promise((resolve) =>
    execFile(CRE, args, { cwd: JUDGE_DIR, timeout: 5 * 60_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) =>
      resolve({ ok: !err, out: `${stdout}\n${stderr}` }),
    ),
  );
}

// The judge reads the record from the operator's evidence host. The first read of a flight downloads and
// decrypts it from 0G Storage, which can take longer than the judge's HTTP timeout, so warm it up first.
const EVIDENCE_URL = (process.env.EVIDENCE_URL || "http://localhost:8788").replace(/\/$/, "");
async function warm(claimId: number) {
  try {
    const c = await E.claims(claimId);
    const r = await fetch(`${EVIDENCE_URL}/lookup?airframe=${c.airframeId}&t=${c.incidentTime}`, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) return log(`claim #${claimId}: evidence host has no flight for this time (${r.status})`);
    const { chainFlightId } = await r.json();
    const t0 = Date.now();
    const e = await fetch(`${EVIDENCE_URL}/evidence/${chainFlightId}`, { signal: AbortSignal.timeout(120_000) });
    log(`claim #${claimId}: record ready on the evidence host (${e.status}, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    log(`claim #${claimId}: evidence warm-up failed: ${(e as Error).message}`);
  }
}

const queue: { tx: string; idx: number; claimId: number }[] = [];
let busy = false;

async function judgeNext() {
  if (busy || !queue.length) return;
  busy = true;
  const job = queue.shift()!;
  try {
    await warm(job.claimId);
    for (let attempt = 1; attempt <= 2; attempt++) {
      log(`claim #${job.claimId}: running the Chainlink CRE judge (attempt ${attempt}) on ${job.tx} event ${job.idx}`);
      const r = await runCre(job.tx, job.idx);
      const lines = r.out.split(/\r?\n/).filter((l) => /verdict|record:|0G Chain|weather|BREACH|REVIEW|error|Error/i.test(l)).slice(-8);
      lines.forEach((l) => log(`  cre | ${l.trim().slice(0, 220)}`));
      const c = await E.claims(job.claimId);
      if (Number(c.verdict) > 0) {
        state.judged[job.tx] = { claimId: job.claimId, at: new Date().toISOString(), verdict: VERDICT[Number(c.verdict)] };
        save();
        log(`claim #${job.claimId}: ${VERDICT[Number(c.verdict)]} written to Arc`);
        break;
      }
      if (attempt === 2) log(`claim #${job.claimId}: still no verdict on Arc after 2 runs. Run it by hand: cd cre/judge && cre ${["workflow", "simulate", "verdict", "--non-interactive", "--trigger-index", "0", "--evm-tx-hash", job.tx, "--evm-event-index", job.idx, "--broadcast", "-T", "staging-settings"].join(" ")}`);
    }
  } catch (e) {
    log(`claim #${job.claimId}: judge run failed: ${(e as Error).message}`);
  } finally {
    busy = false;
    void judgeNext();
  }
}

async function scan() {
  const latest = await arcProvider.getBlockNumber();
  let from = state.lastBlock ? state.lastBlock + 1 : Math.max(0, latest - LOOKBACK);
  while (from <= latest) {
    const to = Math.min(latest, from + CHUNK - 1);
    // one request per range (the public Arc RPC rate-limits), both events parsed from it
    const raw = await arcProvider.getLogs({ address: escrowAddress, fromBlock: from, toBlock: to, topics: [[TOPIC_OPENED, TOPIC_CLOSED]] });
    const parsed = raw.map((l) => ({ l, ev: E.interface.parseLog(l) })).filter((x) => x.ev);
    for (const { ev } of parsed.filter((x) => x.ev!.name === "ClaimOpened")) {
      const id = Number(ev!.args.claimId);
      if (!state.open.includes(id)) state.open.push(id);
    }
    for (const { l: ev, ev: p } of parsed.filter((x) => x.ev!.name === "ClaimWindowClosed")) {
      const claimId = Number(p!.args.claimId);
      state.open = state.open.filter((x) => x !== claimId);
      if (state.judged[ev.transactionHash] || queue.some((q) => q.tx === ev.transactionHash)) continue;
      const c = await E.claims(claimId);
      if (Number(c.verdict) !== 0 || CLAIM_STATES[Number(c.state)] !== "WindowClosed") continue; // already judged
      const rc = await arcProvider.getTransactionReceipt(ev.transactionHash);
      const idx = rc ? rc.logs.findIndex((l) => l.index === ev.index) : 0;
      queue.push({ tx: ev.transactionHash, idx: Math.max(0, idx), claimId });
      log(`claim #${claimId}: claim window closed on Arc -> queued for the Chainlink judge`);
    }
    state.lastBlock = to;
    from = to + 1;
    if (from <= latest) await new Promise((r) => setTimeout(r, 400));
  }
  save();
  void judgeNext();
}

/** close ended claim windows so the judge always runs, even if the victim closed the page */
async function closeEnded() {
  if (!closer) return;
  const now = Math.floor(Date.now() / 1000);
  for (const id of [...state.open]) {
    const c = await E.claims(id);
    if (CLAIM_STATES[Number(c.state)] !== "Open") {
      state.open = state.open.filter((x) => x !== id);
      continue;
    }
    const inc = await E.incidents(c.airframeId, c.incidentId).catch(() => null);
    const windowEnd = inc ? Number(inc.windowEnd ?? inc[1] ?? 0) : 0;
    if (!windowEnd || now < windowEnd + CLOSE_GRACE_S) continue;
    try {
      const tx = await E.connect(closer).getFunction("closeClaimWindow")(id);
      log(`claim #${id}: window ended, closing it on Arc (${tx.hash})`);
      await tx.wait();
    } catch (e) {
      log(`claim #${id}: could not close yet: ${(e as Error).message.split("\n")[0].slice(0, 160)}`);
    }
  }
  save();
}

async function tick() {
  try {
    await scan();
    await closeEnded();
  } catch (e) {
    log(`Arc read failed (will retry): ${(e as Error).message.split("\n")[0].slice(0, 160)}`);
  }
}

process.on("unhandledRejection", (e) => log("ignored:", (e as Error)?.message ?? e));
log(`CRE auto-runner watching SkyProofEscrow ${escrowAddress} on Arc · judge dir ${JUDGE_DIR}${closer ? ` · auto-closes ended windows as ${closer.address}` : " · auto-close off (no CRE_ETH_PRIVATE_KEY)"}`);
void tick();
setInterval(tick, POLL_MS);
