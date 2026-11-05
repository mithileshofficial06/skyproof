# SkyProof: Build Plan

Spec: `docs/SkyProof_Complete_Report.md` · Repo: https://github.com/mithileshofficial06/skyproof
Tick boxes as you go. Each phase ends with an **exit check**; don't start the next phase until it passes.

**One line:** 0G decides and records, Chainlink judges, Arc pays.

---

## Status (5 Nov, night)
- [x] Repo + skeleton pushed
- [x] Python 3.12 venv in `sim/.venv`, PyBullet compiled, gym-pybullet-drones installed
- [x] **D3 PASS**: simulated flight (4 cm error) + 320×240 camera frame
- [ ] Credentials from teammate
- [x] CRE CLI v1.39 (logged in), MetaMask installed on the main laptop
- [x] Decision: Hardhat for 0G contracts

---

## Step 0: Unblock (now)
| # | Task | Owner | Done when |
|---|---|---|---|
| 0.1 | Collect credentials: 0G Private Computer API key + credits, Arc Studio login + project link, CRE account, 3 testnet wallets funded on 0G Galileo and Arc testnet | Teammate | Values in the password manager |
| 0.2 | `copy .env.example .env` and fill it in (never commit `.env`) | You | `.env` complete |
| 0.3 | Install CRE CLI (`cre version` works) and MetaMask (3 wallets imported) | You | Both work |
| 0.4 | Pick Hardhat or Foundry | You | Decided |
| 0.5 | Ask booths: **0G** (which vision model gives verified results?), **Arc** (CRE → Arc Studio contract? escrow template?), **Chainlink** (Arc testnet supported for writes?) | Teammate | Answers noted below |

**Booth answers:**
- 0G: …
- Arc: …
- Chainlink: …

---

## Step 1: Day-0 tests (before feature code)
Scripts go in `scripts/`. If a test fails, use its fallback and note it here.

| # | Test | Pass | Fallback | Status |
|---|---|---|---|---|
| D1 | One image + JSON prompt to the 0G vision model (Private Computer) | JSON verdict + request ID + verification data | Send structured "people in zone" data to a text model | [x] `qwen3.8-flash`, HTTP 200, JSON verdict, `x_0g_trace.request_id` + provider address |
| D2 | 10 timed 0G calls | p95 ≲ 5 s | Longer hover wait; smaller model | [x] 1.4–2.1 s with `enable_thinking:false` (5–47 s with thinking on) |
| D3 | PyBullet flight + camera frame | Flies, frame saved | n/a | [x] |
| D4 | 0G Storage upload + download | Same bytes + root hash | Retry / keep local copy | [x] stored on 4 nodes, downloaded with proof, identical |
| D5 | Deploy a tiny contract to 0G Galileo (16602) | Address | Other tool (Hardhat ↔ Foundry) | [x] Ping at `0x06f915c6552D8f5eeFd9e16a62c89Fc1Dccc5709` (Hardhat) |
| D6 | USDC escrow in Arc Studio | Shareable link + working deposit | Arc booth help | [ ] |
| D7 | `cre workflow simulate` calling Open-Meteo | Simulation succeeds | CRE template | [ ] |
| D8 | CRE writes to an Arc testnet contract | Value changes on Arc | Calldata `settle()` with an on-chain signature check | [ ] |

---

## Phase 1: Core loop (sim + gate + 0G decision)
**Owner A (sim), B (officer)**
- [x] `sim/skyproof_sim/world.py`: city block, permit geofence, no-fly polygon (airport), 2 drop zones, rally points, pedestrians that can be moved into a drop zone, seeded wind gusts
- [x] `sim/skyproof_sim/link.py`: WebSocket link; sends state + camera frame, receives decisions
- [x] `sim/skyproof_sim/gate.py`: runs `TAKEOFF / REROUTE / DROP / LAND` only with a valid ALLOW (nonce, 10 s freshness, request hash); autopilot stays local
- [x] `officer/` (TS): schema check → permit + hard rules (geofence, no-fly, altitude, battery, wind) → person check (sim ground truth) → **0G vision call** → combine → ALLOW/DENY with request ID
- [x] Safe stop: 0G timeout → hold, retry 30 s → rally point → land; log `SAFE_STOP_LOCAL` "no 0G decision claimed"
- [x] Decision feed printed by sim and officer (web console in Phase 4)

**Exit check:** a full mission runs where every drop and landing waits for a 0G decision; a pedestrian in the zone gives DENY `PEOPLE_BELOW`; killing the network triggers the safe stop.

**Result (6 Nov):** ✅ `normal` (7/7 decisions by 0G), ✅ `network_down` (safe stop at R2, "no 0G decision claimed"), ✅ `geofence_breach` (actions recorded without approvals), ⚠️ `people_below`: drone refused the drop, but in the mission run the *detector* caught the person, not 0G (0G did catch it in `vision_probe.py`). Re-test with the sharper DROP prompt once the network is stable.

Run: `cd officer && pnpm officer`, then `cd sim && .venv\Scripts\python.exe mission.py --scenario normal [--gui]`

---

## Phase 2: Record on 0G (Storage + Chain)
**Owner B**
- [ ] Record format: `PERMIT`, `STATE` (5 s batches), `DECISION`, `ACTION`, `SAFE_STOP_LOCAL`, `OVERRIDE`, `CLOSE`; hash chain (`prev`), drone-key signature
- [ ] AES-256-GCM per-flight key; upload to 0G Storage; keep root hashes
- [ ] `contracts/`: `DroneRegistry` (airframe, permit hash, model allowlist) and `FlightLog` (`openFlight`, `anchor`, `closeFlight`); deploy on 0G Galileo
- [ ] Anchor head hash + storage root every 15 s
- [ ] Signed flight permit (JSON) created and its hash registered before take-off
- [ ] Replay script: rebuild a flight from 0G Storage alone and verify against anchors

**Exit check:** a finished flight is rebuilt from 0G Storage and matches its 0G Chain anchors; editing or deleting one record is detected.

---

## Phase 3: Settlement (Arc + Chainlink)
**Owner C**
- [ ] **Arc Studio** (mandatory starting point): `SkyProofEscrow`. Bond deposit, bond lock, claim with refundable deposit, claim window (2 min in demo), `onReport` callable only by the CRE forwarder, payout cap, hold on REVIEW / multiple claims
- [ ] Copy the deployed address and the **shareable Studio link** into `.env` and the README
- [ ] `cre/` workflow: trigger on `ClaimWindowClosed` → read 0G anchors (HTTP RPC) → fetch + decrypt records from 0G Storage → verify chain + signatures + permit hash → Open-Meteo wind → rules B1–B6 → report to `onReport`
- [ ] Rules: B1 GEOFENCE, B2 ALTITUDE, B3 UNAPPROVED_ACTION, B4 OVERRIDE_ON_DENY, B5 RECORD_BROKEN (incl. key not released), B6 UNSAFE_WIND_LAUNCH. Anything else → REVIEW

**Exit check:** a geofence-breach flight pays the victim wallet in USDC on Arc via `cre workflow simulate`; a clean flight gives REVIEW and the funds stay held.

---

## Phase 4: Interfaces
**Owner D**
- [ ] `web/` mission console: sim view, command buttons, decision feed with 0G request IDs, "kill network" toggle
- [ ] Investigator replay (**the live demo link**): load a flight from 0G Storage, 3D path (Three.js), per-record chain check, breach timeline
- [ ] Victim claim page: claim by airframe ID, USDC deposit, live verdict and payout
- [ ] Deploy the replay + claim pages (e.g. Vercel)

**Exit check:** all three demo scenes run end to end from a clean start.

---

## Phase 5: Demo + submission
- [ ] Seeded demo scenarios: `normal`, `people_below`, `network_down`, `geofence_breach`
- [ ] Architecture diagram image in `docs/`
- [ ] README: first line, setup steps, sample 0G request IDs + Storage roots, contract addresses, Arc Studio link, CRE workflow path, "what breaks without 0G"
- [ ] Record the demo video (< 3 min), following the script in the report §11; include Arc Studio and the `cre workflow simulate` run
- [ ] Record a full-length backup video
- [ ] ETHGlobal submission: description, repo, video, live link, contract addresses, team Telegram/X; select **0G Physical AI**, **Arc Advanced Stablecoin Logic**, **Chainlink CRE**
- [ ] Rehearse the judge Q&A (report §13), and avoid the "things not to say"

---

## Sponsor must-haves (don't miss)
| Sponsor | Must have | ✔ |
|---|---|---|
| 0G | 0G call inside the decision loop | [ ] |
| 0G | Episode log on 0G Storage with a request ID per decision | [ ] |
| 0G | Replayable sim | [ ] |
| 0G | Safe stop that never fakes a decision | [ ] |
| Arc | Built starting in Arc Studio; shareable Studio link; Studio in the video | [ ] |
| Arc | Working frontend + backend; architecture diagram | [ ] |
| Chainlink | CRE workflow simulation shown; connects chain + external API; actually triggers the payout | [ ] |
| All | Public repo + README, video < 3 min, live demo link, contract addresses, team contacts | [ ] |

---

## Rules for the team
- Never commit `.env` or private keys. Testnet wallets only.
- Commit small and often, with clear messages (dated commits prove the work was done at the event).
- Run the sim with `sim\.venv\Scripts\python.exe`.
- Any 0G failure must lead to a logged safe stop, never a made-up decision.
