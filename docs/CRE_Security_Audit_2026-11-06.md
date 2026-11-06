# SkyProof: Chainlink CRE integration security audit (2026-11-06)

**Scope:** `cre/judge/verdict/workflow.ts` + configs, the Arc receiver `contracts/arc/SkyProofEscrow.sol` (as deployed at `0x10da…44d8`), the forwarder it trusts, and the evidence host the workflow calls (`officer/src/evidence.ts`), plus `FlightLog.sol` where the judge depends on it.
**Method:** full read of the code paths; on-chain reads of the deployed config; a read-only `eth_call` probe of the forwarder. Every finding is marked **CONFIRMED** (proven by code or chain) or **SUSPECTED** (reasoned, not proven).

## Verdict

**As deployed today, the Chainlink judge can be bypassed by anyone.** The escrow accepts verdicts from a forwarder that checks no signatures, and the workflow-identity checks are switched off. So the "independent judge" guarantee does not hold on testnet. The verification logic inside the workflow is sound, but four design gaps also let a dishonest operator avoid paying a victim without breaking any check. Fix C1 and C2 before calling the payout trust-minimised; fix H1–H4 before calling it fair to victims. For the hackathon, disclose C1 openly as a simulation limitation.

| # | Severity | Finding | Status |
|---|---|---|---|
| C1 | **Critical** | Anyone can forge a verdict: the forwarder accepts unsigned reports, and workflow ID/owner pinning is off | CONFIRMED (on-chain probe) |
| C2 | **Critical** | One admin key can replace the judge (`setForwarder`) and is also the insurer, with no timelock | CONFIRMED (on-chain) |
| H1 | High | The operator can block any verdict by withholding the record (evidence host + decryption key are theirs) | CONFIRMED (code) |
| H2 | High | A crash that leaves the flight unclosed can never be judged (`closedAt = 0`) | CONFIRMED (code) |
| H3 | High | Flying without opening a black box on 0G carries no penalty: no flight → no verdict | CONFIRMED (code) |
| H4 | High | The operator can withdraw the bond right after an accident, before a victim files | CONFIRMED (code) |
| M1 | Medium | `evidenceUrl` is `localhost` in **both** staging and production configs | CONFIRMED (config) |
| M2 | Medium | The weather cross-check is cosmetic, uses the wrong time, and may break consensus | CONFIRMED / SUSPECTED |
| M3 | Medium | One 1-USDC claim makes the evidence host publish every flight's decrypted record | CONFIRMED (code) |
| M4 | Medium | The rules judge the operator's own signed telemetry (garbage in, garbage out) | SUSPECTED (design) |
| M5 | Medium | `reportHash` commits to a summary that is never published, so it can't be audited | CONFIRMED (code) |
| L1 | Low | Only the first breach code is stored on-chain | CONFIRMED |
| L2 | Low | Malformed evidence JSON throws instead of counting as a broken record | CONFIRMED |

---

## C1. Anyone can forge a verdict (Critical, CONFIRMED)

**Evidence.**
- Escrow on-chain: `forwarder = 0x6E9EE680…5eDc1`, `expectedWorkflowId = 0x00…00`, `expectedWorkflowOwner = 0x00…00`. In `onReport`, both checks are skipped when zero (the contract comment says so: *"insecure on a shared forwarder"*).
- The forwarder's bytecode has `report`, `route`, `addForwarder`, but **no `setConfig`/`setDONConfig`**, so it has no DON signer set. It is the CRE **simulation mock forwarder**.
- Probe: `eth_call report(escrow, <forged report>, 0x, [])` from `0x…dEaD` with **zero signatures** **succeeded**.

**Impact.**
1. *Drain bonds:* an attacker opens a claim (1 USDC), waits 2 minutes, closes the window, and calls `forwarder.report` with `verdict=1`. They receive the payout cap (5 USDC) from the operator's bond. Repeatable for every bond.
2. *Censor victims:* front-run the real judge with `verdict=2` (REVIEW). `onReport` accepts one verdict per claim, so a genuine BREACH is locked out and the victim waits for the insurer.

Chainlink adds no security here: the escrow trusts whoever reaches the mock forwarder first.

**Fix.**
- **Production:** deploy the workflow to the CRE DON and point `forwarder` at the **real KeystoneForwarder**, which verifies f+1 DON signatures. Then `setExpectedWorkflowId` and `setExpectedWorkflowOwner`. This needs CRE deploy access.
- **Note:** setting the workflow ID/owner *alone* does not fix the mock. The caller writes the metadata, so they can copy the right ID.
- **Testnet stopgap:** add a `trustedReporter` check (`tx.origin` equals the simulation broadcaster key) behind a `simulationMode` flag the owner can only turn off. Label it clearly as testnet-only.
- **Pitch:** say it plainly: *"CRE runs in simulation with the mock forwarder; production uses the DON-signed forwarder with workflow pinning."*

## C2. One admin key can replace the judge (Critical, CONFIRMED)

**Evidence.**
- `owner` = `insurer` = `0xa4BC…7c6e`, a single externally owned account.
- `setForwarder`, `setExpectedWorkflowId/Owner`, `setInsurer`, `setClaimDeposit` and the timeouts are all `onlyOwner`, take effect immediately, and have no timelock.

**Impact.** The owner can set `forwarder` to their own wallet and write any verdict: pay themselves, or block victims. As insurer, the same key also decides every held claim and receives forfeited deposits. Neutrality depends on trusting one person, which is what CRE was meant to remove.

**Fix.**
- Make the owner a multisig behind a timelock (for example 48 hours).
- Make the forwarder immutable, or changeable only through the timelock.
- Use a separate insurer key, ideally a multisig.
- Emit and publish config changes.

## H1. Withholding the record blocks the verdict (High, CONFIRMED)

**Evidence.**
- `fetchText` / `httpGet` throw on any non-200 response.
- `/lookup` and `/evidence/<id>` are served by the operator's own evidence host, and only the operator holds the decryption key (`.tmp/keys`).
- No error is caught, so the workflow aborts with no report. After `verdictTimeout` (7 days) anyone can `expireClaim`, and the victim gets only their 1-USDC deposit back.

**Impact.** A guilty operator just goes offline. The judge never rules and the victim is never paid. This defeats the purpose of the system.

**Fix.**
- Make withholding a breach. If FlightLog shows a flight covering the incident and the record is unavailable after a retry window, rule **BREACH B5 "record withheld"**.
- Don't let the operator be the only key holder. Encrypt each flight key to a neutral party, for example a threshold or Vault DON secret readable by the workflow, so release doesn't depend on the operator.

## H2. A crash that leaves the flight unclosed can never be judged (High, CONFIRMED)

**Evidence.**
- `FlightLog.openFlight` sets `closedAt: 0`; it is set only by `closeFlight`.
- The workflow throws when `incidentTime > closedAt`.
- The evidence `lookup` skips manifests that are not `closed`.

**Impact.** A drone that falls out of the sky (power loss, crash) usually never sends `closeFlight`. That is exactly the accident SkyProof exists for, and it can't be judged.

**Fix.**
- Treat `closedAt == 0` as open-ended: accept incidents at or after `openedAt` and judge against the anchors that exist.
- A flight still unclosed after its permit window counts as B5.
- The evidence host should serve unclosed flights too.

## H3. No black box means no penalty (High, CONFIRMED)

**Evidence.** If no sealed flight covers the incident time, `/lookup` returns 404, the workflow throws, and no verdict is written.

**Impact.** The cheapest way to avoid liability is to never open a flight on 0G. A bonded, registered drone that flew unrecorded is treated the same as "no incident".

**Fix.** If the airframe is bonded and no flight covers the incident, return **REVIEW**: the insurer then decides using the victim's sealed evidence. Optionally, treat it as **BREACH "unrecorded flight"** when the victim's evidence places the airframe there.

## H4. The bond can be withdrawn after an accident, before a victim files (High, CONFIRMED)

**Evidence.**
- `withdrawBond` only requires `pendingClaims == 0` and a cooldown of `claimWindow` (120 s) after the *last claim close*.
- `openClaim` requires `isActive` (bond ≥ cap).

**Impact.** After a crash the operator withdraws the bond immediately. The airframe goes inactive, and `openClaim` reverts for every victim.

**Fix.**
- Two-step withdrawal: request, then wait a delay no shorter than the incident reporting period (for example 7 days).
- Accept claims for incidents that happened while the bond was posted, even if the airframe is inactive now.
- This is the pending "Arc timelock redeploy" item.

## M1. Localhost evidence URL in production config (Medium, CONFIRMED)
`config.production.json` has `evidenceUrl: http://localhost:8788`. DON nodes cannot reach it, so a production deployment would fail every run, and combined with H1 no claim would ever resolve.

**Fix:** a public HTTPS evidence endpoint, separate configs per environment, and a deploy-time check that rejects localhost.

## M2. The weather cross-check is cosmetic (Medium, CONFIRMED / SUSPECTED)
- **CONFIRMED:** the workflow fetches the *current* wind at judging time, not the wind at the incident. The value only goes into the logs and `reportHash`; it never affects the verdict. B6 uses the operator's own recorded `windMs`. Describing this as a "weather cross-check" overstates what it does.
- **SUSPECTED:** live weather fetched by several nodes seconds apart can differ, and `consensusIdenticalAggregation` would then fail the whole run.

**Fix:** use Open-Meteo's historical endpoint at the incident timestamp, aggregate with the median, and apply B6 against it (for example when independent wind exceeds the permit limit by more than a margin).

## M3. The evidence host over-releases records (Medium, CONFIRMED)
`hasClaim` releases a flight if *any* recent claim exists for the airframe. `/evidence/<id>` has no authentication and sends `Access-Control-Allow-Origin: *`.

**Impact:** one 1-USDC claim publishes every flight's decrypted record (paths, camera decisions) to anyone.

**Fix:** release only the flight that covers an open claim's incident time, and authenticate the requester (DON node keys).

## M4. Garbage in, garbage out (Medium, SUSPECTED / design)
B1, B2 and B6 judge positions, altitude and wind that the operator signs itself. An operator who lies in real time, signing false telemetry as it flies, passes every check: the chain proves the log wasn't edited, not that it's true.

**Fix (roadmap):** independent signals such as Remote ID / ADS-B receivers, a secure element signing raw sensor data, and cross-checking with victim evidence. Say this openly; the research doc already advises it.

## M5. Unpublished report summary (Medium, CONFIRMED)
`reportHash = keccak(canonical(summary))`, but the summary (breaches, issues, `recordsHash`) is stored nowhere, so nobody can check the verdict against it.

**Fix:** store the summary on 0G Storage and include its root in the report, or emit it in an event.

## L1 / L2 (Low, CONFIRMED)
- **L1:** `breachCode` keeps only the first breach. Keep the full list in the published summary (see M5).
- **L2:** if the evidence host returns malformed JSON or a body without `records`, the workflow throws instead of counting B5. This is the same failure as H1; handle it with the same fix.

## What is solid
- **Record verification is correct:**
  - the hash chain (`prev` links)
  - re-hashing of canonical JSON
  - the operator's signature recovered on every record
  - each anchor head matched against its record
  - no records accepted after the last anchor
  - the permit hash bound to the flight on 0G Chain
  - the flight bound to the claim by airframe and time window
- **The evidence host is not trusted for content:** a doctored record fails the checks against 0G Chain.
- **The escrow is careful:**
  - one verdict per claim
  - state-machine checks
  - `nonReentrant` everywhere it moves money
  - fixed report length
  - verdict value limited to 1 or 2
  - a fallback that credits a payment instead of failing it
  - timeouts so funds can't be stuck forever
- **The CRE workflow is deterministic:** large records are checked per node, and only the compact result goes through consensus.

## Priority order
1. **C1:** tell judges about the mock forwarder now. Production: real forwarder plus workflow pinning; testnet: `trustedReporter` stopgap.
2. **C2:** multisig + timelock, and a separate insurer.
3. **H4 + H2 + H1:** withdrawal delay, judging unclosed flights, and a withheld record counting as BREACH. These go in one escrow/workflow update, the planned Arc redeploy.
4. **H3, M1, M3:** REVIEW for an unrecorded flight, a public evidence URL, narrow key release.
5. **M2, M5:** a real weather check at incident time, and a published report summary.

---

## Fix log (2026-11-06, workflow only, no redeploy)

| Finding | Fix | Verified |
|---|---|---|
| H1 withholding blocks the verdict | Evidence host unreachable / non-200 / unreadable -> **BREACH B5 "record withheld"**; never throws | Simulated with the host offline: claim #4 -> BREACH B5 |
| H2 unclosed (crashed) flight can't be judged | `closedAt == 0` accepted (incident after `openedAt`); found via `FlightLog.openFlightOf` even without the host; counts as B5 "flight never closed" | Unit test |
| H3 no black box -> no verdict | No flight covers the incident -> **REVIEW** with code `NO_RECORDED_FLIGHT` (a human decides) | Code path |
| (new) approvals reusable / mismatched | An action needs a decision for the **same command** (or the situation choice it executes), **≤ 10 s old**, **used once** | Unit tests; all 236 real approved actions pass |
| (new) record not ending in CLOSE ignored by the judge | Now B5, matching the officer's verifier | All 31 published flights: same verdict as the officer |
| M2 weather cosmetic / non-deterministic | Hourly wind at the **take-off hour** (stable past data, same on every node); above permit limit + 2 m/s -> **B6** | Unit tests; live sims read 1.8 m/s |
| B1 gaps between samples | Geofence / no-fly checked along the line between consecutive samples | Unit tests (real flights unchanged) |

Open (need an escrow redeploy): C1 forwarder + workflow pinning, C2 timelock/multisig, H4 withdrawal delay; M3 narrow key release; M5 publish the report summary.
