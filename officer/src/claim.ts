// The victim's side: file a claim on Arc for an incident during a flight, wait out the claim window,
// then close it, which emits ClaimWindowClosed: the event that triggers the Chainlink judge.
//   pnpm claim <local-flight-id>
import { ethers } from "ethers";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { airframeKey, contracts, provider as zgProvider } from "./chain.js";
import { arcProvider, arcVictim, CLAIM_STATES, ensureAllowance, escrow, send, usd } from "./arc.js";

const TMP = fileURLToPath(new URL("../.tmp/", import.meta.url));
const id = process.argv[2];
if (!id) throw new Error("usage: pnpm claim <local-flight-id>");
const m = JSON.parse(readFileSync(`${TMP}flights/${id}.manifest.json`, "utf8"));
if (!m.closed) throw new Error("flight is not sealed on 0G yet: wait for the officer to close it");

// Incident: where the package came down (the DROP action), at that moment.
const records = readFileSync(`${TMP}flights/${id}.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const drop = records.find((r) => r.type === "ACTION" && r.body.cmd.type === "DROP") ?? records.find((r) => r.type === "ACTION");
const { log } = contracts(zgProvider);
const f = await log.flights(m.chainFlightId);
const incidentTime = Number(f.openedAt) + Math.max(1, Math.round((drop?.localTime - records[0].localTime) / 1000) || 1);
const pos = drop?.body.state.pos ?? [0, 0];
const lat = BigInt(Math.round(pos[0] * 1e6)); // sim world: metres x 1e6
const lon = BigInt(Math.round(pos[1] * 1e6));
const statement = { flightId: m.flightId, what: "package struck a person in the drop area", at: pos };
const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(statement)));

const victim = arcVictim();
const e = escrow(victim);
console.log(`victim ${victim.address} files a claim against ${m.airframeId} (flight ${m.chainFlightId.slice(0, 18)}…)`);
await ensureAllowance(victim, await e.claimDeposit());
const r = await send("openClaim (1 USDC deposit)", e.openClaim(airframeKey(m.airframeId), incidentTime, lat, lon, evidenceHash));
const opened = r.logs.map((l: any) => { try { return e.interface.parseLog(l); } catch { return null; } }).find((x: any) => x?.name === "ClaimOpened");
const claimId = Number(opened.args.claimId);
const inc = await e.currentIncident(airframeKey(m.airframeId));
console.log(`  claim #${claimId} opened; claim window ends at ${new Date(Number(inc.windowEnd) * 1000).toISOString()}`);

for (;;) {
  const b = await arcProvider.getBlock("latest");
  if (b && b.timestamp > Number(inc.windowEnd)) break;
  process.stdout.write(`  waiting for the claim window (${Number(inc.windowEnd) - (b?.timestamp ?? 0)} s left)\r`);
  await new Promise((res) => setTimeout(res, 5000));
}
const r2 = await send("closeClaimWindow", e.closeClaimWindow(claimId));
const idx = r2.logs.findIndex((l: any) => { try { return e.interface.parseLog(l)?.name === "ClaimWindowClosed"; } catch { return false; } });
const c = await e.claims(claimId);
const out = { claimId, flightId: m.flightId, chainFlightId: m.chainFlightId, closeTx: r2.hash, eventIndex: r2.logs[idx].index, state: CLAIM_STATES[Number(c.state)], cap: usd(c.cap) };
mkdirSync(`${TMP}claims`, { recursive: true });
writeFileSync(`${TMP}claims/${claimId}.json`, JSON.stringify(out, null, 2));
console.log(out);
console.log(`\nnext: run the Chainlink judge on this event:\n  cd cre/judge && cre workflow simulate verdict --non-interactive --trigger-index 0 --evm-tx-hash ${r2.hash} --evm-event-index ${out.eventIndex} --broadcast`);
