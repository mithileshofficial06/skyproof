// Plain-English flight summary for insurers, investigators and anyone new to SkyProof.
// Built only from the published (0G-verified) flight file. Written next to it on the website
// (web/public/data/flights/<id>.summary.txt) and to reports/flights/<id>.txt in the repo.
//   pnpm summary <flightId>      one flight
//   pnpm summary --all           every published flight
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const WEB = fileURLToPath(new URL("../../web/public/data/flights/", import.meta.url));
const OUT = fileURLToPath(new URL("../../reports/flights/", import.meta.url));
const ZG = "https://chainscan-galileo.0g.ai";
const ZGS = "https://storagescan-galileo.0g.ai";

const SCENARIO: Record<string, string> = {
  normal: "Normal delivery: no hazards were set up on the route.",
  people_below: "Person in the drop zone: someone walks into the delivery spot while the drone is about to drop.",
  network_down: "0G unreachable: the link to 0G is cut during the flight.",
  geofence_breach: "Cheating operator: the safety gate is switched off and the drone flies into a no-fly zone without asking 0G.",
  full: "Full mission: a crowd, a crane, a fake 'safe to drop' sign, a gust and a battery fault on one flight.",
  blocked: "Drop zone blocked: the planned drop zone cannot be used.",
};
const ACT: Record<string, string> = { TAKEOFF: "take off", REROUTE: "fly to the next waypoint", DROP: "drop the package", LAND: "land", MANEUVER: "perform a manoeuvre" };
const SITUATION: Record<string, string> = {
  OBSTACLE: "an obstacle ahead",
  PEOPLE_UNDER_PATH: "people below the flight path",
  CHOOSE_DROP_SPOT: "which spot to drop the package on",
  ZONE_BLOCKED: "the drop zone being blocked",
  EMERGENCY: "an in-flight emergency",
};
const RULES: [string, string][] = [
  ["B1_GEOFENCE", "Stayed inside the permitted area and out of every no-fly zone"],
  ["B2_ALTITUDE", "Stayed under the height ceiling"],
  ["B3_UNAPPROVED_ACTION", "Every action (take-off, reroute, drop, land) was approved by 0G first"],
  ["B4_OVERRIDE_ON_DENY", "Nobody overrode a 0G refusal"],
  ["B5_RECORD_BROKEN", "The record is complete and unedited (matches the fingerprints on 0G Chain)"],
  ["B6_UNSAFE_WIND_LAUNCH", "Did not take off in wind above the permit limit"],
];
const by = (s: string | undefined) => (s === "0G" ? "0G Private Computer" : s === "0G+DETECTOR" ? "0G, made stricter by the drone's local person detector" : s === "HARD_RULES" ? "the permit's hard rules" : s === "NONE" ? "nobody (0G could not be reached)" : s ?? "unknown");
const wrap = (s: string, ind = "      ") => s.replace(/(.{1,92})(\s+|$)/g, `$1\n${ind}`).trimEnd();

export function summarize(f: any): string {
  const L: string[] = [];
  const p = f.records[0]?.body?.permit ?? {};
  const t0 = f.records[0]?.localTime ?? 0;
  const at = (r: any) => `${(((r.localTime ?? t0) - t0) / 1000).toFixed(1).padStart(5)} s`;
  const started = new Date((f.chain.openedAt ?? 0) * 1000);
  const breaches: string[] = f.report.breaches.map((b: any) => b.code);
  const hr = (c = "=") => L.push(c.repeat(96));

  hr();
  L.push("SKYPROOF FLIGHT SUMMARY (plain English)");
  hr();
  L.push(`Flight ID      : ${f.flightId}`);
  L.push(`Drone          : ${p.airframeId ?? "SKY-001"}`);
  L.push(`Flown          : ${started.toUTCString()}`);
  L.push(`Test scenario  : ${SCENARIO[f.scenario] ?? f.scenario}`);
  L.push(`Operator wallet: ${f.chain.operator}`);
  L.push("");
  L.push("This summary is generated from the drone's sealed black box: every decision, position and action");
  L.push("was signed, encrypted and uploaded to 0G Storage during the flight, and fingerprinted on 0G Chain.");
  L.push("It is a readable view of that record; the sealed record itself is the evidence.");
  L.push("");

  hr("-");
  L.push("1. THE RULES THE DRONE AGREED TO (signed flight permit, before take-off)");
  hr("-");
  L.push(`  - Fly only inside the permitted area${p.noFly?.length ? `, never inside: ${p.noFly.map((z: any) => z.name).join(", ")}` : ""}.`);
  if (p.altCeilingM !== undefined) L.push(`  - Stay under ${p.altCeilingM} m (simulator scale).`);
  if (p.maxWindMs !== undefined) L.push(`  - Do not take off if the wind is above ${p.maxWindMs} m/s.`);
  if (p.minBatteryReserve !== undefined) L.push(`  - Keep at least ${Math.round(p.minBatteryReserve * 100)}% battery in reserve.`);
  L.push("  - Before every take-off, reroute, drop and landing, ask 0G and act only on a fresh ALLOW.");
  L.push("");

  hr("-");
  L.push("2. WHAT HAPPENED, STEP BY STEP");
  hr("-");
  for (const r of f.records) {
    const b = r.body ?? {};
    if (r.type === "PERMIT") L.push(`  ${at(r)}  Flight opened under the signed permit (permit fingerprint ${String(b.permitHash).slice(0, 18)}...).`);
    else if (r.type === "SCENE" && b.event !== "setup") L.push(`  ${at(r)}  Scene: ${b.event}.`);
    else if (r.type === "EVENT") L.push(`  ${at(r)}  In flight: ${b.event}.`);
    else if (r.type === "DECISION" && b.kind === "SITUATION") {
      const sit = b.request?.situation;
      L.push(`  ${at(r)}  SITUATION: the drone met ${SITUATION[sit?.kind] ?? sit?.kind}${sit?.detail ? ` (${sit.detail})` : ""}.`);
      if (b.vetoed?.length) L.push(wrap(`        Options ruled out by the permit before asking: ${b.vetoed.map((v: any) => `${v.id} (${v.why})`).join("; ")}.`, "        "));
      L.push(wrap(`        Decided by ${by(b.source)}: ${b.choice ? `chose ${b.choice}` : "no choice made"}. Reason given: "${b.reason}"`, "        "));
      if (b.zg?.requestId) L.push(`        0G request ID ${b.zg.requestId}, model ${b.zg.model}, answered in ${(b.zg.latencyMs / 1000).toFixed(1)} s.`);
    } else if (r.type === "DECISION") {
      const cmd = b.request?.cmd?.type;
      L.push(`  ${at(r)}  ASKED 0G: may the drone ${ACT[cmd] ?? cmd}?`);
      L.push(wrap(`        Answer: ${b.verdict}${b.code && b.code !== "OK" ? ` (${b.code})` : ""}, decided by ${by(b.source)}. Reason: "${b.reason}"`, "        "));
      if (b.zg?.requestId) L.push(`        0G request ID ${b.zg.requestId}, model ${b.zg.model}, answered in ${(b.zg.latencyMs / 1000).toFixed(1)} s.`);
    } else if (r.type === "ACTION") {
      const cmd = b.cmd?.type === "MANEUVER" ? b.cmd.choice : b.cmd?.type;
      L.push(`  ${at(r)}  ACTION: the drone did ${ACT[b.cmd?.type] ? ACT[b.cmd.type] : cmd} ${b.decisionHash ? "WITH an approved 0G decision." : "WITHOUT any approval  <-- rule B3"}`);
    } else if (r.type?.startsWith("SAFE_STOP")) {
      L.push(wrap(`  ${at(r)}  SAFETY FALLBACK: ${b.step} (${b.detail}). Pre-approved local action; no 0G decision was claimed.`, "        "));
    } else if (r.type === "OVERRIDE") L.push(`  ${at(r)}  OVERRIDE: the operator overrode a decision  <-- rule B4`);
    else if (r.type === "CLOSE") L.push(`  ${at(r)}  Flight ended. Battery left: ${Math.round((b.finalState?.battery ?? 0) * 100)}%.`);
  }
  L.push("");

  hr("-");
  L.push("3. THE INDEPENDENT JUDGE'S CHECKS (Chainlink workflow, objective rules)");
  hr("-");
  for (const [code, text] of RULES) {
    const n = breaches.filter((c) => c === code).length;
    L.push(`  [${n ? "BROKEN" : "  OK  "}] ${code.slice(0, 2)}  ${text}${n ? `  (${n}x)` : ""}`);
  }
  for (const b of f.report.breaches.slice(0, 12)) L.push(`           - ${b.code}: ${b.detail}`);
  L.push("");

  hr("-");
  L.push("4. IS THIS RECORD GENUINE?");
  hr("-");
  L.push(`  ${f.report.ok ? "YES." : "NO."} ${f.report.records} records; ${f.report.ok ? "every fingerprint matches the anchors sealed on 0G Chain." : `problems: ${f.report.issues.join("; ")}`}`);
  L.push("  Where the evidence lives:");
  for (const s of f.segments) L.push(`    - records ${s.fromSeq}-${s.toSeq}: 0G Storage root ${s.rootHash}`);
  for (const s of f.segments) L.push(`      anchored on 0G Chain: ${ZG}/tx/${s.anchorTx}`);
  if (f.chain.openTx) L.push(`    - flight opened on 0G Chain: ${ZG}/tx/${f.chain.openTx}`);
  L.push(`    - look up any storage root at ${ZGS}`);
  L.push("");

  hr("-");
  L.push("5. VERDICT AND MONEY");
  hr("-");
  if (f.report.verdict === "BREACH") {
    L.push("  BREACH: the sealed record shows at least one objective rule was broken.");
    L.push("  If a victim files a claim, the Chainlink judge pays them automatically from the operator's");
    L.push("  USDC bond on Arc (up to the payout cap), and refunds their 1 USDC claim deposit.");
  } else {
    L.push("  REVIEW: the sealed record shows no objective rule was broken.");
    L.push("  If a victim files a claim, the money is held on Arc and a human insurer decides, using this");
    L.push("  same sealed record plus the victim's own sealed evidence. Nothing is paid automatically.");
  }
  L.push(`  Claims filed against this flight: ${f.claims.length ? f.claims.map((c: any) => `#${c.claimId} (${c.state}, ${c.verdict})`).join(", ") : "none"}.`);
  L.push("");

  hr("-");
  L.push("6. FOR AN INSURER, IN ONE MINUTE");
  hr("-");
  const decisions = f.records.filter((r: any) => r.type === "DECISION").length;
  const zg = f.records.filter((r: any) => r.type === "DECISION" && String(r.body.source).startsWith("0G")).length;
  const unapproved = breaches.filter((c) => c === "B3_UNAPPROVED_ACTION").length;
  const stops = f.records.filter((r: any) => r.type?.startsWith("SAFE_STOP")).length;
  L.push(`  - ${decisions} decisions were requested; ${zg} were answered by 0G Private Computer.`);
  L.push(`  - ${unapproved ? `${unapproved} action(s) happened WITHOUT 0G's approval.` : "Every action the drone took was approved by 0G first."}`);
  if (stops) L.push(`  - ${stops} safety fallback(s): the drone stopped safely rather than act without approval.`);
  L.push(`  - The record ${f.report.ok ? "is intact" : "is NOT intact"}: ${f.report.ok ? "nobody, including the operator, has changed it since the flight." : "treat it as evidence of tampering (rule B5)."}`);
  L.push(`  - Outcome: ${f.report.verdict === "BREACH" ? "operator at fault on objective rules; automatic payout applies." : "no objective breach; any claim goes to human review."}`);
  L.push("");

  hr("-");
  L.push("GLOSSARY");
  hr("-");
  L.push("  0G Private Computer : the AI service that looks at the drone's camera and answers ALLOW / DENY.");
  L.push("  0G Storage          : where the encrypted black box is uploaded during the flight.");
  L.push("  0G Chain            : where each part of the record is fingerprinted, so edits are detectable.");
  L.push("  Chainlink judge     : an independent workflow that checks the record and the rules, then rules.");
  L.push("  Arc / USDC bond     : money the operator locks in advance; it pays victims on a BREACH.");
  L.push("  Safety fallback     : a pre-approved safe action when 0G can't answer; never a faked approval.");
  hr();
  return L.join("\n") + "\n";
}

const arg = process.argv[2];
if (arg) {
  mkdirSync(OUT, { recursive: true });
  const ids = arg === "--all" ? readdirSync(WEB).filter((n) => n.startsWith("SKY-") && n.endsWith(".json")).map((n) => n.slice(0, -5)) : [arg];
  for (const id of ids) {
    const text = summarize(JSON.parse(readFileSync(`${WEB}${id}.json`, "utf8")));
    writeFileSync(`${WEB}${id}.summary.txt`, text);
    writeFileSync(`${OUT}${id}.txt`, text);
    console.log(`summary: ${id}`);
  }
}
