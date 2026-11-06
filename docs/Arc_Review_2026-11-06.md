# SkyProof: Arc integration review (2026-11-06)

**Scope:** everything that touches Arc:
- `contracts/arc/SkyProofEscrow.sol`, deployed at `0x10da…44d8` on Arc Testnet (chain 5042002)
- `contracts/deployments/arc.json` and the escrow ABI
- `officer/src/arc.ts`, `arc-setup.ts` and `claim.ts`
- `web/src/lib/arc.ts`, `web/src/app/claim/page.tsx` and `web/src/app/insurer/page.tsx`
- the CRE judge's write path into the escrow (`cre/judge/verdict/workflow.ts`)

**Method:**
- read every file in that scope in full
- read the live escrow state over the Arc RPC (config, airframe, all five claims, USDC balance)
- matched the ABI's function selectors against the deployed bytecode
- queried Arcscan for verified source

This builds on `docs/CRE_Security_Audit_2026-11-06.md`. Findings already listed there are referenced, not repeated. **A1 is new, and it is the most serious.**

## Verdict

**Arc is genuinely integrated end to end, the low-level Solidity is careful, and the economics are broken.** These things work on testnet: real USDC bonds, real claims, verdicts written by CRE, and payouts and holds that show up on Arcscan. The contract has a proper state machine, uses `nonReentrant` and SafeERC20, and falls back to a credit when a USDC transfer is blocked. The weaknesses:
- A payout is not tied to a victim or to an incident.
- The same accident can be paid again and again. This has already happened on-chain.
- The money-moving contract has no tests and its source is not verified on Arcscan.
- Circle's tooling is barely used beyond USDC itself and Arc Studio.

For a track judged on "advanced stablecoin logic" this is a credible entry, not a winning one. Fixing A1, A2 and A3 below would change that more than any new feature.

| # | Severity | Finding | Status |
|---|---|---|---|
| A1 | **Critical** | Anyone can claim against any flight with a breach, any number of times; one accident has already been paid twice | **CONFIRMED (on-chain)** |
| C1 | **Critical** | Forged verdicts via the mock forwarder; workflow pinning is off (existing audit) | CONFIRMED (re-read live: ID/owner still `0x0`) |
| C2 | **Critical** | One key is owner and insurer, with no timelock (existing audit); that key has also been the claimant and was paid | CONFIRMED (on-chain) |
| A2 | High | No tests for the escrow at all; the "8 contract tests pass" proof covers only FlightLog and DroneRegistry | CONFIRMED |
| A3 | High | When the bond equals the cap, the second claim gets 0 USDC and is still marked "Paid"; no pro-rata | CONFIRMED (code) |
| A4 | High | Claims are grouped by filing time, not incident; a 1-USDC junk claim turns an automatic payout into a manual hold | CONFIRMED (code) |
| H4 | High | Bond can be withdrawn right after an accident (existing audit) | CONFIRMED, still open |
| A5 | Medium | If the insurer stays silent, the victim gets only the deposit back; claims #2 and #4 are in that state now | CONFIRMED (on-chain) |
| A6 | Medium | Escrow source not verified on Arcscan | CONFIRMED |
| A7 | Medium | Little use of Circle tooling beyond USDC and Arc Studio; victims need MetaMask plus USDC for gas | CONFIRMED (code); effect on judging SUSPECTED |
| A8 | Low | The claimant chooses the incident time freely, with no lower bound; `lat`/`lon` actually hold sim metres | CONFIRMED |
| A9 | Low | The claim page guesses the claim ID before sending the transaction (race) | CONFIRMED (code) |

---

## A1. Anyone can claim any breached flight, again and again (Critical, CONFIRMED on-chain)

**Evidence.**
- The judge reads only `claimId`, `airframeId` and `incidentTime` from the event (`workflow.ts:95`). It never uses `lat`, `lon`, `evidenceHash` or `victim`. It finds the flight that covers `incidentTime` and pays on **any** breach in that flight, even one unrelated to the incident (for example a B3 at take-off for a claim about the drop).
- The escrow has no record of which flights or incidents have already been paid. `openClaim` accepts any `incidentTime <= now`.
- **On-chain:** claims #3 and #5 have the same `incidentTime` (1793918548), the same `lat`/`lon` (3445000/2910000) and the same `evidenceHash` (`0x8f8ca9e5…`). Both are `Paid` with `B3_UNAPPROVED_ACTION`, and each took 5 USDC from the bond.
- The claim page lets any visitor pick any published flight and pre-fills the incident from the record. The app itself walks a stranger through this.

**Impact.** This holds **even after C1 is fixed with the real DON forwarder.**
- Any flight with a breach is a free payout for anyone. File a claim, wait 2 minutes, close the window, and the judge honestly rules BREACH. Repeat every 2 minutes or more so each claim is its own "incident" and is paid automatically, until the bond is empty.
- The H1 fix (record withheld means BREACH B5) makes this worse: any time the operator's evidence host is down, any claim for any time inside a still-open flight is paid.

**Fix.**
1. **One payout per incident:** store `paidFlight[chainFlightId]` (or a key built from the flight and the incident) and send the flight ID in the report. A second BREACH for the same flight goes to REVIEW, not automatic payment.
2. **Tie the breach to the incident:** pay automatically only when a breach falls within ±N seconds of `incidentTime`, or when B1 places the drone near the claimed location. A record-wide breach such as B5 goes to REVIEW.
3. **Tie the claimant to the incident:** the judge should check that the claimed `lat`/`lon` is within X m of the drone's recorded position at `incidentTime`. The data is already in the record.
4. Reject incident times older than the bond's coverage period (see A8).

## C1 / C2 updates (existing audit)

- **C1** is still live. Read today: `forwarder = 0x6E9E…eDc1` (the mock), `expectedWorkflowId = 0x0`, `expectedWorkflowOwner = 0x0`.
- **C2:** the owner/insurer key `0xa4BC…7c6e` is the **victim** on claims #3, #4 and #5, and was paid 2 × (5 + 1) USDC from the operator's bond. That's a demo shortcut, but a judge reading Arcscan will see the insurer paying itself. Use a separate victim wallet for demos, as claims #1 and #2 did.

## A2. The escrow has no tests (High, CONFIRMED)

- `contracts/hardhat.config.ts` uses the default source folder `contracts/contracts/`, so `contracts/arc/SkyProofEscrow.sol` is never compiled or tested in this repo. It exists only as an Arc Studio build.
- `contracts/test/FlightLog.test.ts` is the only test file. Its 8 tests cover DroneRegistry and FlightLog. `proofs/tests/02-contract-tests-8-pass.png` can be read as covering the escrow. It doesn't.
- Good news: all 44 functions in the repo ABI are in the deployed bytecode, and the source matches the ABI. So the repo describes what is deployed.

**Fix:** add the escrow to Hardhat, either with a second `sources` path or by moving the file, plus a mock USDC and a mock forwarder. Test:
- every state transition
- payment and its refund, and their `totalBonds`/`totalClaimDeposits` accounting
- a duplicate claim (A1)
- a second claim when bond equals cap (A3)
- held and verdict timeouts
- the credit fallback with a reverting token
- metadata pinning

That's about 3 hours, and contract quality is what this track is judged on.

## A3. A second claim can be "Paid" 0 USDC (High, CONFIRMED in code)

`_payAndRefund` pays `min(claim.cap, airframe.bond)`. The live airframe has `cap = bond = 5 USDC`. After one payout the bond is 0, and:
- a held claim the insurer then approves is marked `Paid` and emits `Payout(…, 0)`
- the victim gets only their deposit back
- the insurer's resolution order decides who gets paid

The airframe also goes inactive, so later victims can't file at all.

**Fix:**
- Require `bond >= k × cap` (for example k = 3).
- Reserve funds per incident and split them pro rata among approved claims in that incident.
- Never mark a claim `Paid` for 0: hold it with a "bond exhausted" status instead.

## A4. Claims are grouped by filing time, not by incident (High, CONFIRMED in code)

An "incident" is any set of claims opened within `claimWindow` (120 s) of the first claim for that airframe (`openClaim:274-280`). `incidentTime` plays no part. This causes three problems:
- Two victims of the same crash who file 3 minutes apart count as two incidents. Both are paid automatically, first come first served, which drains the bond (see A3).
- Two unrelated incidents filed within 2 minutes of each other are merged, and both are held.
- **Griefing:** an attacker files a junk 1-USDC claim within 120 s of a real one. `claimCount > 1` sends the real BREACH to `Held`. The attacker loses 1 USDC, and the victim now depends on the insurer (see A5).

**Fix:** group claims by `chainFlightId`, which the judge already resolves (send it in the report), or by `incidentTime` within a window. Don't use filing time. Decide whether holds apply per flight after the verdict, not when the claim is opened.

## A5. A silent insurer means the victim loses (Medium, CONFIRMED on-chain)

`expireHeld` after `heldTimeout` (30 days) refunds only the deposit. Claims #2 and #4 are `Held` right now, with deadlines around 5 Dec 2026. The operator's bond is locked until then too (`pendingClaims = 2`, so `withdrawBond` reverts). Once the insurer has said nothing for 30 days, both sides lose.

**Fix:** pick a default and explain it in the pitch. For example: when the record is intact and no breach is found, expiry releases the hold in the operator's favour with the deposit refunded; when it is held for multiple claims and there was a BREACH, expiry pays out.

## A6. Source not verified on Arcscan (Medium, CONFIRMED)

`getsourcecode` returns only the address. Judges can't read the contract on the explorer, and the C1/C2 caveats can't be checked publicly. **Fix:** verify it through Arc Studio or the Arcscan (Blockscout) verifier. That's about 15 minutes, and the repo source already matches the ABI.

## A7. Little use of Circle tooling (Medium, CONFIRMED in code; effect on judging SUSPECTED)

Arc is used for:
- USDC through its ERC-20 interface (`0x3600…`)
- USDC as gas
- an Arc Studio deployment

Victims connect with MetaMask, add the network by hand, and need USDC for both gas and the deposit. The Arc track says it scores how effectively Arc Studio and Circle's developer tools are used. **Fix:** onboard victims with one Circle tool, such as Circle Wallets or sponsored gas, so a person hit by a drone can file without crypto know-how. This was already flagged as M1 in `Prize_Odds_2026-11-06.md`.

## A8. Unvalidated incident data (Low, CONFIRMED)

- `incidentTime` only has to be `<= block.timestamp`, so a claim can target a flight from months ago (this feeds A1).
- The `lat`/`lon` fields hold simulated metres × 1e6 (`claim.ts:23`), not degrees. That's fine for a demo, but say so, or rename the fields before anyone reads the event as real GPS.

**Fix:** reject `incidentTime` older than a coverage period (for example 7 days, matching the H4 withdrawal delay).

## A9. The claim page guesses the claim ID (Low, CONFIRMED in code)

`claim/page.tsx` reads `nextClaimId` *before* sending `openClaim` and assumes that's the new claim's ID. If someone else files at the same time, the page follows the wrong claim and its "Close claim window" button acts on someone else's claim. **Fix:** parse `ClaimOpened` from the receipt, as `officer/src/claim.ts:33` already does.

---

## What is solid

- **A real end-to-end flow on Arc:** bond deposit, claim, window close, a CRE verdict through the forwarder, then a payout or a hold. All of it is visible on Arcscan and backed by `proofs/arc/*`.
- **Arc-specific details are right:**
  - USDC through its 6-decimal ERC-20 interface for amounts
  - the 18-decimal native currency for the wallet's network settings (`web/src/lib/arc.ts`)
  - a credit fallback (`_sendOrCredit`) so a blocked USDC recipient can't freeze a payout
- **Careful Solidity:**
  - an explicit state machine
  - one verdict per claim
  - a fixed report length
  - the verdict word checked before narrowing
  - `nonReentrant` on every function that moves funds
  - accounting updated before transfers
  - the operator bound before the first deposit, so nobody can squat an airframe
  - verdict and held timeouts so funds can't be stuck forever
- **The deployment matches the repo:** all 44 ABI functions are in the bytecode.

## Fix order (highest return first)

1. **A1:** one payout per flight, plus a breach within ±N s of the incident. Send `chainFlightId` in the report. Redeploy.
2. **A2:** escrow test suite, including the A1/A3/A4 cases as regression tests.
3. **C1 stopgap + A6:** the `tx.origin` simulation guard, then verify on Arcscan. Say plainly in the README that the forwarder is the mock.
4. **A3 + A4 + H4:** bond ≥ k × cap, grouping by flight, and a time-locked withdrawal. Do these in the same redeploy as step 1.
5. **A7:** one Circle tool for victim onboarding.
6. **C2:** separate keys for owner, insurer and demo victim, at minimum. Multisig plus timelock is the roadmap.

Steps 1–4 are one escrow redeploy plus a small change to the workflow's report format: `(claimId, verdict, breachCode, reportHash, chainFlightId)`, with `report.length` raised to 160.
