# SkyProof: can it win its sponsor tracks? (6 Nov 2026)

Scope: the code as it is today. Hosting, the demo video and the README are left out on purpose. Every probability below is a judgment estimate, not a measurement. The inputs behind each one are marked **confirmed** (checked in the code, on-chain or on the live prize page) or **suspected**.

## 1. What the tracks actually pay (confirmed, ethglobal.com/events/mumbai/prizes)

| Track | Payout | Places | Fit |
|---|---|---|---|
| 0G · Physical AI: Agents with a Body | $2,500 / $1,500 (+$1,000 for real hardware only) | **2 for a sim build** | Excellent |
| Arc · Best Smart Contracts with Advanced Stablecoin Logic (in Arc Studio) | $3,000 | **1** (no places listed) | Good |
| Chainlink · Best workflow with CRE | $1,500 | **1** (no places listed) | Good |

- The earlier "$7,000 ceiling" holds only if you win all three. Two of the three tracks are winner-takes-all.
- 0G pays "at 0G's discretion, and not every place is guaranteed to be awarded".
- Baseline from 0G's ETHGlobal Lisbon 2026 recap: 67 projects entered 0G's tracks and 9 won. Most winners used **TEE-attested** 0G Compute. The only robotics project among them came 2nd in a general AI track.

## 2. Verdict and probabilities

| Track | P(any prize) | P(top place) | Expected $ |
|---|---|---|---|
| **0G Physical AI** | **45–55%** | 20–25% (1st) | ~$950 |
| **Chainlink CRE** | **15–25%** | same: one prize | ~$300 |
| **Arc Advanced Stablecoin Logic** | **10–18%** | same: one prize | ~$420 |
| At least one of the three | **~60–65%** | | **~$1,650 total EV** |
| ETHGlobal finalist | ~3–5% | | |

**Why 0G is the best bet:** the build hits every must-have, each verified in code and in the proof pack:
- 0G in the decision loop, gating takeoff, drop, land and reroute, plus 5 situation choices.
- Every decision logged on 0G Storage with its request ID.
- A replay rebuilt from 0G alone, and tamper tests that catch edits and deletions.
- An honest safe stop that claims no 0G decision.
- Real PyBullet physics and a polished 3D replay site.

Physical AI needs a simulator or hardware, so far fewer teams will enter it than the generic AI tracks (suspected). Two places for a sim build is a good ratio.

**Why Arc and Chainlink are long shots:** each pays one winner, and both are tracks many teams tick by default (suspected, based on past ETHGlobal events). For both, SkyProof's integration is real, but it's the payout and judging leg of a drone project rather than the star. Both also have holes a careful judge will find in the code (below).

## 3. Findings, ranked

### CRITICAL
**C1. Anyone can force a BREACH verdict and drain any operator's bond.** *Confirmed in code and docs; not exploited.*
- The escrow trusts `forwarder = 0x6E9EE680…eDc1`. Chainlink's Forwarder Directory lists that address as the **MockKeystoneForwarder for simulation on Arc Testnet**. It checks no signatures from the Chainlink network, and anyone can call its `report()`. The explorer shows your own deployer wallet doing exactly that.
- `expectedWorkflowId` and `expectedWorkflowOwner` are unset, and the contract's own comment says this is "insecure on a shared forwarder". Even if they were set, the mock forwarder passes caller-supplied metadata, so they could be spoofed.
- Attack: open a claim (1 USDC deposit) → wait out the 2-minute window → `closeClaimWindow` → call the mock forwarder with verdict=1. The attacker collects the 5 USDC cap plus the deposit, and can repeat while the bond lasts.
- Both the Arc and Chainlink judges read contracts, and "Advanced Stablecoin Logic" is judged on contract quality.
- **Fix (about 1 h):** while in simulation, also require `tx.origin == simulatorBroadcaster`, the address of `CRE_ETH_PRIVATE_KEY`. Then say plainly in the README and the pitch: "in production this is the KeystoneForwarder, which checks the Chainlink network's signatures, plus a pinned workflow ID and owner." Redeploy through Arc Studio.

### HIGH
**H1. The "weather cross-check" doesn't affect the verdict.** *Confirmed: workflow.ts:203-210.*
- The workflow fetches the *current* Open-Meteo wind and only copies it into the report summary.
- B6 uses the wind value the drone reported about itself (`b.state.windMs`), and the sim sets that value.
- So the one external API, which is the thing the CRE track asks for, is decoration.
- **Fix:** fetch the hourly wind for the incident's date and hour (Open-Meteo `archive`/`past_days`) and apply B6 to it. Then add a new "drone under-reported wind" check that compares the drone's figure with Open-Meteo's.

**H2. The record comes from the operator's own server, not from 0G Storage.** *Confirmed.*
- `evidenceUrl = http://localhost:8788` is the operator's evidence host. It downloads from 0G Storage and decrypts. The workflow log still says "12 records from 0G Storage", which a judge can fairly call misleading.
- If the operator withholds the record, `fetchText` throws and **no verdict is written**. B5 is supposed to cover "key not released within the window", but the workflow never applies it.
- A deployed workflow could never reach localhost.
- **Fix:**
  - Catch an evidence failure or timeout and write **BREACH B5 "evidence withheld"**.
  - Fetch the ciphertext from the 0G Storage indexer by its anchored root, and get only the per-flight key from the operator.
  - Fix the log wording.

**H3. Whoever files first on a breaching flight gets paid, with no check that they were affected.** *Confirmed: the workflow ignores the claim's `lat`, `lon` and `evidenceHash`.*
- Only the multi-claim hold limits this.
- **Fix:** in the workflow, require the claim's location to be within N metres of the drone's track at `incidentTime`. Otherwise return REVIEW.

**H4. The 0G inference is not shown to be verified or TEE.** *Confirmed: the live call returned `x-0g-e2ee: none` and `provider_identity: aliyun`.*
- Lisbon's 0G winners mostly showed TEE-attested inference.
- The Physical AI track doesn't require TEE, but this is the obvious follow-up question from 0G's judges, and CHECKLIST 0.14 is still open.
- **Fix:** ask the 0G booth today. If a verified or TEE vision model exists, switch to it and log the attestation or verification field in each DECISION record.

**H5. The operator can withdraw the bond right after a crash, before the victim files.** *Confirmed.*
- `withdrawBond` checks only pending claims and the cooldown since the last closed claim.
- The time-locked withdrawal is on your checklist as "pending in Arc Studio".
- **Fix:** add `requestWithdraw` → `executeWithdraw` after a delay at least as long as the claim window, and block new withdrawal requests while an incident is open.

### MEDIUM
- **M1. Thin use of Circle tools beyond USDC and Studio.** *Confirmed: the claim page uses MetaMask.* Arc judges "how effectively they use Arc Studio and Circle's developer tools". **Fix:** onboard victims with Circle Wallets or pay gas in USDC (Paymaster), so a victim needs no crypto knowledge.
- **M2. The CRE workflow is not deployed** ("Deploy Access: Not enabled"). Simulation is allowed, but a deployed workflow stands out. Run `cre account access` now; approval may not arrive in time.
- **M3. Visible AI misses.** CHECKLIST 2.17 (0G misses the single pedestrian in `people_below`) is still open, so a demo can show 0G approving an unsafe drop (suspected: not re-checked). Either fix it or frame it on purpose: "the black box caught 0G's mistake".
- **M4. The pitch was already called "solution-first" by 0G** (suspected; from your own research notes). Lead with Barcarès and Orlando, as Deep_Research recommends.

### LOW
- **L1.** The escrow source isn't verified on arcscan. Verify it so judges can read it on the explorer.
- **L2.** Two claims (#3 and #4) from 6 Nov aren't documented.

## 4. What moves the odds most (in order)
1. Fix C1 and H2's withheld-evidence = BREACH → Chainlink to ~25–30%, Arc to ~18–22%.
2. Make the weather check real (H1) → Chainlink +5 pts.
3. Verified or TEE 0G model, with attestation in the record (H4) → 0G any place to ~55–65%.
4. Time-locked withdrawal and the claimant-location check (H5, H3) → Arc +3–5 pts.
5. One Circle tool for victim onboarding (M1) → Arc +3–5 pts.

## 5. Overall verdict
SkyProof is a **realistic contender for 0G Physical AI**, its best and most natural fit. It's an **outsider for Chainlink CRE and Arc**, which each pay one team. Today the expected haul is about $1,650, with a ~60% chance of at least one prize. C1 is the one finding that could embarrass you in front of judges: fix it before anyone reads the escrow.

Sources: [ETHGlobal Mumbai prizes](https://ethglobal.com/events/mumbai/prizes) · [0G Lisbon 2026 recap](https://0g.ai/blog/ethglobal-lisbon-2026-recap) · [CRE Forwarder Directory](https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts)
