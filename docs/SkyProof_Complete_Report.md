# SkyProof: Complete Project Report (v4)

**Event:** ETHGlobal Mumbai, 5–7 November 2026
**Sponsors (3, the ETHGlobal maximum):** 0G (Physical AI) · Arc (Advanced Stablecoin Logic, in Arc Studio) · Chainlink (CRE)
**Repository:** https://github.com/mithileshofficial06/skyproof (local: `D:\SkyProof`)
**Date:** 5 November 2026
**Status:** Spec final. Setup in progress.

> **One line:** SkyProof is an independent black box for the automated decisions drones already make. **0G decides and records, Chainlink judges, Arc pays.**

---

## 1. What changed from v3, and why

The 0G sponsor team said the earlier pitch looked like a solution in search of a problem. They told us to work only on an existing problem and to show real data. Deep research (`docs/Deep_Research_2026-11-05.md`) confirmed the problem is real, but it is a different problem from the one v3 led with.

| v3 | v4 (this report) | Reason |
|---|---|---|
| Headline: "an AI officer approves every command" | Headline: **"after a drone crash, the only record belongs to the operator"** | No fielded drone lets an LLM or VLM approve missions. The record-custody problem has investigator-level evidence |
| An LLM safety officer judges every command | A **0G vision model does the drop and landing-zone check** that delivery drones already do with ML (e.g. Amazon MK30) | Mirrors a real, existing decision. It stays inside the decision loop, as the 0G track requires |
| Payout on broad "record broken" logic | Payout only on **objective breaches checked against a signed flight permission** | Answers the critique that on-chain payouts lose their edge when fault is judged by hand |
| 60 s leases renewed through 0G | Continuous telemetry records plus 15 s anchors, and a timeout-based safe stop | Simpler. Gaps stay detectable |
| "0G Compute TeeML broker" | **0G Private Computer** (pc.0g.ai), OpenAI-compatible, with verified runs and request IDs | This is the product named on the 2026 prize page |
| Python 3.11 | **Python 3.10** (PyBullet compiled on Windows with MSVC Build Tools) | PyBullet ships no Windows wheels |

---

## 2. The problem (real data only)

### 2.1 Drones crash in public, and some crashes hurt people
| Incident | What happened | Source |
|---|---|---|
| **Barcarès, France (2019)** | A DJI Inspire 2 filming a festival **injured 3 people**. The operator blamed a "battery failure". | [BEA2019-0416](https://bea.aero/fileadmin/user_upload/BEA2019-0416_1.pdf) |
| **Orlando, USA (Dec 2024)** | Show drones fell into the crowd. **A 7-year-old needed open-heart surgery.** The NTSB found configuration errors that no cross-check caught. | [FOX 35](https://www.fox35orlando.com/news/orlando-drone-show-errors-led-lake-eola-crash-seriously-injured-7-year-old-ntsb) |
| **Manna, Ireland** | A propeller blade came off and struck a man mowing his lawn. **Manna did not notify the investigator as required.** | [Irish Times](https://www.irishtimes.com/ireland/dublin/2024/11/08/man-injured-by-fallen-drone-propeller-while-mowing-lawn-investigators-say) |
| **Amazon Pendleton (Dec 2024)** | Two MK30s "erroneously determined they had touched down" after a software update. **Amazon disputed the NTSB finding.** | [DroneDJ](https://dronedj.com/2025/05/19/amazon-delivery-drone-crash-ntsb/) |
| **Amazon Tolleson (Oct 2025)** | Two MK30s hit the same crane within minutes. Flights resumed about 48 h later, on Amazon's own review. | [CNBC](https://www.cnbc.com/2025/10/02/amazon-drone-crash-faa-ntsb.html) |
| **Amazon Darlington, UK (Jul 2026)** | The AAIB classified it as an accident. Amazon said the drone "responded as designed". | [DroneXL](https://dronexl.co/2026/08/17/amazon-drone-crash-darlington-aaib-caa-verdict/) |
| **Zipline, Houston (Sep 2026)** | A drone parachuted onto Highway 6. Cause "under investigation", and some answers were called "proprietary". | [DroneXL](https://dronexl.co/2026/09/16/zipline-answers-drone-safety-questions-amazon-wing-silent/) |
| **Skye Air, Gurugram (Feb 2024)** | A delivery drone crashed in a residential area. Police filed an FIR. | [ThePrint](https://theprint.in/india/drone-carrying-package-crashes-in-gurugram-locality-fir-against-company/1969281/) |

**Scale is growing.** Zipline has made 2M+ deliveries and Walmart 1M+ US drone deliveries (May 2026). Zipline raised $1.5B on 5 Nov 2026.

### 2.2 The record belongs to the party under investigation
- **Barcarès:** the BEA could not check the operator's story because *"the flight logs were no longer present on the drone, the pilot's tablet or the cameraman's phone."* The BEA does not say the deletion was deliberate.
- **NTSB cases run on operator-supplied data:** Staten Island (2017), where the operator provided the logs, and Orlando, where the operator recovered the SD cards and about 5 drones' data was lost in the lake.
- **Disputes:** Amazon vs the NTSB on Pendleton. Tolleson flights resumed on the operator's own review, before any public finding.
- **Rules require self-kept records, with no integrity requirement:** EU 2019/947 ("keep a record"), UK CAA (3 years, digital), and the proposed FAA Part 108 (an operator-run flight data system). India mandated tamper-proof NPNT logging in March 2021, then **deferred it** in August 2021.
- **Analogy:** in Tesla Benavides, Tesla said it lacked crash data that a hacker later recovered. The verdict was **$243M**, with Tesla 33% liable.

### 2.3 Drones already make safety-critical automated decisions
- **Amazon MK30:** ML models detect people, animals and obstacles and trigger evasive action. The FAA approved BVLOS operations in Oct 2024.
- **Skydio:** onboard AI autonomy, used by 320+ police agencies.
- **Zipline:** automatic parachute deployment.
- **CHAI (UCSC/JHU, IEEE SaTML 2026):** a printed "Safe to land" sign made VLM drone agents judge a debris-strewn roof safe **up to 68.1% of the time, in simulation**. As drones adopt vision-language models, their inputs and decisions need an independent record.

### 2.4 Problem statement
> Autonomous drones crash in public and sometimes injure people. After every crash, the only detailed record of what the drone sensed and decided sits with the operator. No rule anywhere requires that record to be tamper-evident or held independently. Victims, investigators and insurers get what the operator hands over, or nothing.

---

## 3. The solution

### 3.1 Three ideas
1. **Decide on 0G.** Before every drop, landing or reroute, a **0G vision model** (Private Computer, verified run) checks the camera frame and state: *is the zone clear of people? is it inside the permit?* It answers ALLOW or DENY with a **request ID**. The drone acts only on ALLOW, together with local hard rules.
2. **Record on 0G.** Every decision, the telemetry (every 0.5 s, batched every 5 s), every safe stop and every manual override becomes a **hash-chained, encrypted record** on **0G Storage**. Its head hash is **anchored on 0G Chain every 15 s**.
3. **Judge with Chainlink, pay on Arc.** After a claim, a **Chainlink CRE workflow** checks the record against the **signed flight permission** and the weather. On an objective breach, the operator's **USDC bond on Arc pays the victim automatically**. Any other case is held for the insurer, with a verified evidence pack.

### 3.2 Who uses it
| User | Gets |
|---|---|
| Drone operator | Proof of compliant flights; a faster path to permissions and insurance |
| Victim | A fast first-loss payment on clear breaches, plus evidence they can trust |
| Investigator / regulator | A record the operator could not edit or lose |
| Insurer | Verified evidence packs for the cases that need judgment |

### 3.3 Honest limits (say them first)
- The record proves **what the drone logged and decided**, not that its sensors were truthful. Roadmap: cross-check against Remote ID and ground observers.
- A fully modified drone can bypass the gate. The system is tamper-*evident* for unmodified firmware, not tamper-*proof*. Missing records count against the operator.
- The 0G vision model can be fooled (CHAI). Its decisions are recorded honestly, and an independent person detector plus hard rules must also agree.
- SkyProof pays a capped first-loss amount. It does not replace insurance or courts.

---

## 4. Architecture

```
┌──────────────── Operator side (laptop in the demo) ────────────────┐
│ [PyBullet sim] ◄─ state/camera ─► [Flight computer + GATE]         │
│  drone, city, no-fly zones,          autopilot (local, instant)     │
│  people, wind                        mission cmds need ALLOW        │
│                                         │ ▲                         │
│                          request        ▼ │ ALLOW / DENY + reqId    │
│                                  [Officer service (TS)]             │
│                                  permit check → hard rules →        │
│                                  person detector → 0G vision call   │
│                                  → record chain → encrypt → upload  │
└───────────────┬───────────────────────┬────────────────────────────┘
                │                       │
   [0G Private Computer]     [0G Storage]          [0G Chain]
    vision model, verified    encrypted records     DroneRegistry, FlightLog
                                                    (permit hash, anchors)
                                       │
          victim claim ─► [Arc: SkyProofEscrow] ─ ClaimWindowClosed event
                                       │
                          [Chainlink CRE workflow]
               reads 0G anchors + records, Open-Meteo weather,
               checks permit rules → verdict report
                                       │
                          [Arc: SkyProofEscrow.onReport] → USDC payout / hold
```

### 4.1 Responsibilities
| Part | Does | Never does |
|---|---|---|
| Flight computer + gate | Flies; runs mission commands only with a valid ALLOW; runs the safe stop | Approve its own commands |
| Officer service | Permit and hard-rule checks, detector, 0G call, record chain, upload, anchors | Execute commands |
| 0G Private Computer | The ALLOW/DENY decision with a request ID and verification | Store data |
| 0G Storage + Chain | Durable records; permit hash; ordered anchors | Judge fault |
| Chainlink CRE | Independent verdict from objective rules | Hold money |
| Arc escrow | Bonds, claims, deposits, payouts | Interpret flight data |

---

## 5. Component specifications

### 5.1 Simulator (`sim/`, Python 3.12)
- **Engine:** PyBullet with `gym-pybullet-drones` (Crazyflie model, PID waypoint control). 0G's prize page lists PyBullet as an accepted simulator.
- **World:** a scaled city block with a no-fly polygon (airport), the permit geofence, two drop zones, rally points, and pedestrians that can be placed in drop zones.
- **Wind:** `applyExternalForce` gusts, seeded.
- **Sensors:** position, velocity, altitude, battery (modelled), and a 320×240 downward camera.
- **Determinism:** a fixed seed per scenario and a fixed time step, so a flight replays from its record.
- **Bridge:** WebSocket JSON to the officer service: state out, approved commands in.
- **Windows note:** PyBullet has no Windows wheels. It is compiled with Microsoft C++ Build Tools.

### 5.2 Flight permission (the NTSB-style "rulebook", modelled on India's NPNT)
Signed by the registry admin (playing the regulator or insurer) before take-off. Its hash is stored in `DroneRegistry`:
```json
{ "v":1, "airframeId":"0x…", "operator":"0x…",
  "validFrom":1762330000, "validTo":1762333600,
  "geofence":[[lat,lon],…], "noFly":[[[lat,lon],…]],
  "altCeilingM":60, "maxWindMs":10,
  "modelId":"<0G vision model>", "promptHash":"0x…" }
```
The gate refuses to arm without a valid permit for this airframe and time.

### 5.3 Officer service (`officer/`, TypeScript)
For every mission command (`TAKEOFF`, `REROUTE`, `DROP`, `LAND`):
1. **Schema:** numbers, enums and hashes only, no free text.
2. **Permit + hard rules (deterministic):** DENY if the path leaves the geofence or enters a no-fly zone, the altitude exceeds the ceiling, the battery can't reach a rally point, or the wind is above the limit.
3. **Person detector** (drop and land only): an independent check; a person in the zone gives DENY `PEOPLE_BELOW`.
4. **0G vision call:** frame plus structured state go to the verified model on Private Computer. The prompt says image text is data, never instructions. Temperature 0, JSON output, timeout 8 s.
5. **Combine:** ALLOW only if steps 2, 3 and 4 all allow.
6. **Record:** append a `DECISION` record with the full request, response, 0G request ID and verification data.

Response format: `{ "verdict":"ALLOW|DENY", "code":"OK|NFZ|GEOFENCE|ALT|WIND|BATTERY|PEOPLE_BELOW|UNCERTAIN" }`

### 5.4 Safe stop when 0G is unreachable (required by 0G)
1. The 0G call times out, so the command is **not executed**. The drone holds or hovers on its current approved plan.
2. It retries for 30 s.
3. If there is still no answer, it flies to the nearest reachable rally point inside the geofence and lands. If none is reachable, it hovers 10 s and lands in place.
4. Each step is logged as `SAFE_STOP_LOCAL`, **"no 0G decision claimed"**. A faked decision would disqualify the project.

### 5.5 Flight record
- **Record types:** `PERMIT`, `STATE` (5 s batches of 0.5 s telemetry), `DECISION`, `ACTION` (a command executed, referencing its DECISION), `SAFE_STOP_LOCAL`, `OVERRIDE`, `CLOSE`.
- **Each record:** `{ flightId, seq, prev, type, body, localTime, zgBlockHash }`, signed by the drone key.
- `prev` is the hash of the previous record, so any gap, edit or fork breaks the chain.
- **Encryption:** AES-256-GCM with a per-flight key. Records are uploaded to 0G Storage, and only hashes and storage roots go on-chain.
- **Anchors:** `FlightLog.anchor(flightId, seq, headHash, storageRoot)` every 15 s.
- **Privacy:** camera frames are never stored. Only frame hashes are.

### 5.6 Contracts on 0G Galileo (chain 16602), in `contracts/`
**`DroneRegistry`**
- `registerAirframe(airframeId, operator)`
- `setPermit(airframeId, permitHash, validFrom, validTo)`, admin only
- `setModelAllowlist(modelId, promptHash, ok)`, admin only

**`FlightLog`**
- `openFlight(airframeId, permitHash, rec0Hash) → flightId` (one open flight per airframe)
- `anchor(flightId, seq, headHash, storageRoot)`, where `seq` must strictly increase
- `closeFlight(flightId, finalHead)`

Tooling: Foundry or Hardhat (Foundry's installer was blocked on the main laptop; Hardhat is the fallback).

### 5.7 Arc escrow: `SkyProofEscrow` (built in Arc Studio, USDC)
- `depositBond(airframeId, amount)`. Required bond = `k × cap`. Cap is tiered by weight class × area class.
- **Bond lock:** no withdrawal while a flight or claim is open, or within the claim window after the last flight.
- `openClaim(airframeId, time, place, evidenceHash)` with a small refundable USDC deposit.
- **Claim window:** 24 h in production, 2 minutes in the demo. Claims on the same incident collect during the window.
- `onReport(claimId, verdict, breachCode, reportHash)`: **callable only by the Chainlink CRE forwarder**.
- **Payout:** `BREACH` with a single valid claim pays the cap to the victim. Multiple claims, or `REVIEW`, hold the funds for the insurer.
- **Deposit:** refunded if the claim's time and place match a recorded flight.
- Emits events for the dashboard and the CRE trigger.

### 5.8 Chainlink CRE workflow (`cre/`, TypeScript + Bun)
**Trigger:** the `ClaimWindowClosed` log on Arc (or a cron trigger as fallback).
1. Read the flight's anchors from 0G Chain (JSON-RPC over HTTP). 0G isn't a CRE chain, so it is read as an external API.
2. Fetch records for the incident window from 0G Storage over HTTP and decrypt them with the per-flight key the operator released on the claim.
3. Verify the hash chain and anchors, the drone signatures, and that the permit hash matches the registry.
4. Fetch **historical wind from Open-Meteo** for the time and place.
5. Apply the rules (Section 6), and write the signed report to `SkyProofEscrow.onReport` on Arc.

Run with `cre workflow simulate` (simulation is enough for the prize).

### 5.9 Frontend (`web/`, Next.js)
| Screen | Shows |
|---|---|
| **Mission console** | The live sim view, command buttons, a decision feed (✅ ALLOW / ⛔ DENY / ⚠ SAFE_STOP with 0G request IDs), and a "kill network" toggle |
| **Investigator replay** (the live demo link) | A flight rebuilt from 0G Storage in the browser (Three.js), chain integrity per record, and a breach timeline |
| **Victim claim page** | File a claim by airframe ID, deposit USDC, watch the verdict and payout |
| **Escrow dashboard** | Bonds, claims, verdicts; also shown inside Arc Studio |

---

## 6. Settlement rules (objective only)

The CRE workflow pays **only** when a breach can be computed from the record and permit, with no human judgment:

| Code | Breach | Computed from |
|---|---|---|
| **B1 GEOFENCE** | The drone was outside the permit geofence or inside a no-fly zone | `STATE` positions vs permit polygons |
| **B2 ALTITUDE** | Altitude above the permit ceiling | `STATE` altitude |
| **B3 UNAPPROVED_ACTION** | A `DROP` or `LAND` executed with no matching 0G ALLOW | `ACTION` records without a valid `DECISION` reference |
| **B4 OVERRIDE_ON_DENY** | A manual override executed an action that was denied | `OVERRIDE` after a DENY of the same command |
| **B5 RECORD_BROKEN** | A gap, edit, fork, missing anchor, or a key not released within the window | Hash chain and anchors |
| **B6 UNSAFE_WIND_LAUNCH** | Take-off when measured wind exceeded the permit limit | Open-Meteo wind vs `maxWindMs` |

- **Any breach → `BREACH`:** automatic first-loss payout.
- **No breach → `REVIEW`:** funds held, and the insurer receives the evidence pack. A policy-compliant safe stop is never a breach.

---

## 7. Sponsor requirements and how each is met

### 7.1 0G: Physical AI, Agents with a Body ($5,000: $2,500 / $1,500 / $1,000 real hardware)
| 0G requires | SkyProof delivers | ✔ |
|---|---|---|
| A 0G call inside the decision loop (vision, voice or decision model) | The 0G vision model's ALLOW/DENY gates every drop, landing and reroute | ✅ |
| An episode log on 0G Storage with a request ID per decision | Every `DECISION` record carries the 0G request ID; the records live on 0G Storage | ✅ |
| A replayable simulation or a live hardware demo | Seeded PyBullet sim, plus a replay rebuilt from 0G Storage | ✅ |
| A safe-stop fallback if 0G is unreachable; a faked decision disqualifies | `SAFE_STOP_LOCAL`, explicitly "no 0G decision claimed", shown live with the kill-network toggle | ✅ |
| **Not wanted:** chatbot with a robot avatar | There is no chat; real physical actions are gated | ✅ |
| **Not wanted:** pre-recorded motion | Live physics, driven by 0G answers | ✅ |
| **Not wanted:** 0G used only for logs | 0G **decides** (Private Computer) **and** records (Storage + Chain) | ✅ |
| Submission: name and description, public repo with README and setup, video under 3 min, live demo link, contract addresses, team contacts (Telegram/X) | See Section 12 | ☐ |

**"What breaks without 0G":** the drone can't drop or land, and nobody can prove which model approved what, or that the record wasn't edited.

### 7.2 Arc: Best Smart Contracts with Advanced Stablecoin Logic, in Arc Studio ($3,000)
| Arc requires | SkyProof delivers | ✔ |
|---|---|---|
| **Arc Studio as the starting point** | `SkyProofEscrow` written, tested and deployed in Arc Studio | ☐ |
| USDC/EURC with advanced programmable logic (conditional flows, automation, multi-step settlement) | A bond lock, a claim window, deposits, CRE-gated conditional release, and risk-tiered caps | ✅ |
| Fits the listed example "conditional escrow with on-chain disputes and automatic release" | Exactly this | ✅ |
| A shareable Arc Studio project URL; Studio shown in the demo | The link goes in the README and submission; a Studio clip in the video | ☐ |
| Working frontend + backend | Claim page and console + officer service and CRE | ☐ |
| An architecture diagram | Section 4, redrawn as an image in `docs/` | ☐ |
| Video demo, presentation, documentation, GitHub link | Section 12 | ☐ |
| State the bounty | "Best Smart Contracts with Advanced Stablecoin Logic" | ☐ |
| Bonus: contracts reusable by other builders | Escrow is generic: any "evidence verdict → stablecoin release" app can reuse it | ✅ |

### 7.3 Chainlink: Best Workflow with CRE ($1,500)
| Chainlink requires | SkyProof delivers | ✔ |
|---|---|---|
| A CRE workflow used as an orchestration layer | CRE sits between 0G (data), Open-Meteo (API) and Arc (money) | ✅ |
| Integrate at least one blockchain with an external API, system or data source | Arc and 0G Chain + 0G Storage HTTP + Open-Meteo | ✅ |
| A successful CRE CLI simulation, or a live deployment | `cre workflow simulate` shown in the video | ☐ |
| Meaningfully used | **Only the CRE forwarder can trigger a payout** | ✅ |

### 7.4 ETHGlobal rules
- At most **3 partner sponsors**: 0G, Arc and Chainlink. ✅
- The work must be done during the event. Commits are dated in the public repo. ✅

**Prize ceiling:** $2,500 + $3,000 + $1,500 = **$7,000**.

---

## 8. Competitors and how SkyProof differs
| Existing | What it does | What SkyProof adds |
|---|---|---|
| Red Cat + GoChain (2019) | Drone flight data on a blockchain | Decisions made on 0G; objective payouts |
| Southampton + Minima (Mar 2026) | On-chain "black box" from a live flight | AI decisions gated and recorded; victim payout |
| Pathfinder Black Box (Monad hackathon) | Hash-chains an AI copilot's decisions | Permit rules, CRE verdict, USDC bond; admits the same sensor limit |
| India NPNT / Digital Sky | Signed flight permission before arming; tamper-proof logs deferred | Permission + tamper-evident record + independent custody |
| Flock / SkyWatch.AI | Insurance priced from flight data | Not pricing; **fast first-loss payout** on objective breaches |
| Verifiable Blackbox (ETHGlobal Tokyo 2026) | Robot job evidence and payments | Drone-specific permit rules and victim compensation |

**Positioning line:** *"Others prove a log wasn't edited. We keep it out of the operator's hands, gate the drone's decisions through 0G, and pay victims automatically when the record shows a rule was broken."*

---

## 9. Threat model
| Threat | Control |
|---|---|
| Operator edits or deletes records | Hash chain, 15 s anchors on 0G Chain, copies on 0G Storage. A gap is B5 |
| Operator forges a 0G approval | Request ID plus verification from 0G Private Computer, re-checked by CRE |
| Operator uses a lenient model or prompt | The model and prompt allowlist in `DroneRegistry` |
| Sign or prompt-injection attack on the vision model (CHAI) | Image text treated as data; the independent person detector and hard rules must also allow; all inputs hashed in the record |
| Replay of an old ALLOW | Single-use nonce, a 10 s freshness limit, and the request hash bound to the command |
| Bond withdrawn after a crash | Bond lock until the claim window and verdict close |
| Fake or duplicate claims | Deposit, evidence hash, time/place match; multiple claims → REVIEW |
| Operator refuses to release the decryption key | Treated as B5 RECORD_BROKEN |
| Privacy (home addresses) | Encrypted records; only hashes on-chain; no camera frames stored |
| Payout triggered by someone other than Chainlink | `onReport` accepts the CRE forwarder only |

---

## 10. Build plan

### 10.1 Day-0 tests (run first)
| # | Test | Pass condition | Fallback |
|---|---|---|---|
| D1 | One image + JSON request to the 0G vision model on Private Computer | JSON verdict + request ID + verification data | Send detector output as structured data to a text model |
| D2 | Time 10 calls to 0G | p95 under ~5 s | Longer hover wait; smaller model |
| D3 | PyBullet `pid.py` flies, and one camera frame is saved | Flight + 320×240 frame | Lower-resolution camera |
| D4 | Upload to and download from 0G Storage | Same bytes + root hash | Pin locally and retry |
| D5 | Deploy a small contract on 0G Galileo | Address returned | Hardhat instead of Foundry |
| D6 | Simple USDC escrow in Arc Studio | Shareable link + working deposit | Ask the Arc booth |
| D7 | `cre workflow simulate` calling Open-Meteo | Simulation succeeds | CRE templates |
| D8 | CRE writes to an Arc testnet contract | Value changes on Arc | Calldata `settle()` with an on-chain signature check |

### 10.2 Phases
1. **Core loop:** sim world + gate + officer + 0G vision call. *Exit:* a full mission where every drop and landing is gated by a 0G decision.
2. **Record:** record chain + encryption + 0G Storage + `DroneRegistry`/`FlightLog` + anchors + safe stop. *Exit:* the flight is rebuilt from 0G Storage, and the kill-network toggle produces a correct `SAFE_STOP_LOCAL`.
3. **Settlement:** Arc Studio escrow + CRE workflow + breach rules. *Exit:* a geofence breach pays a victim wallet in USDC through a CRE report; a clean flight gives REVIEW.
4. **Interfaces + demo:** console, replay page (live link), claim page, diagram, README, video.

### 10.3 Acceptance criteria
- Every drop, landing and reroute in the demo shows a 0G request ID in the console and in the record.
- Any flight replays from 0G Storage alone.
- The CRE verdict matches the replay page's verdict for every test scenario.
- No camera frame or plaintext location appears on-chain or in unencrypted storage.

### 10.4 Team split
| Person | Owns |
|---|---|
| A | `sim/`: PyBullet world, gate, bridge |
| B | `officer/`: 0G vision calls, record chain, Storage, `contracts/` on 0G |
| C | Arc Studio escrow + `cre/` workflow |
| D | `web/`: console, replay, claim page, video |

---

## 11. Demo script (3 minutes)
| Time | Scene | What judges see |
|---|---|---|
| 0:00 | **Hook (the BEA quote on screen)** | "Three people were injured. The investigator couldn't check the operator's story, because the logs were gone from every device. Drones now make thousands of automated decisions a day, and the only record belongs to the operator." |
| 0:25 | **Scene 1: 0G decides** | Permit loaded. A drop is requested with a pedestrian below → **DENY `PEOPLE_BELOW`**, and the drone holds. The pedestrian leaves → **ALLOW**, the drop happens. Each step shows a 0G request ID |
| 1:05 | **Scene 2: 0G unreachable** | Kill network → the drone hovers, then lands at the rally point. Replay shows `SAFE_STOP_LOCAL`, "no 0G decision claimed" |
| 1:40 | **Scene 3: a breach pays** | The operator forces a shortcut through the no-fly zone, and the drone hits a "person". The victim files a claim → CRE simulation runs → **B1 GEOFENCE** → USDC arrives in the victim's wallet on Arc (shown in Arc Studio) |
| 2:35 | **Proof** | The replay page rebuilds the flight from 0G Storage; the anchors on 0G Chain match |
| 2:50 | **Close** | "0G decides and records. Chainlink judges. Arc pays." |

Prepare a backup recording before judging.

---

## 12. Submission checklist
**Common (ETHGlobal + all sponsors)**
- ☐ Project name and short description
- ☐ Public GitHub repo, with a README (first line: *"The drone cannot drop or land until a 0G vision model approves, and every decision is recorded where the operator can't edit it."*) and setup steps
- ☐ Demo video under 3 minutes
- ☐ Live demo link (the replay page)
- ☐ Contract addresses: `DroneRegistry` and `FlightLog` (0G Galileo), `SkyProofEscrow` (Arc testnet)
- ☐ Team names and Telegram/X contacts

**0G extras**
- ☐ Sample 0G request IDs and 0G Storage root hashes in the README
- ☐ One sentence on what breaks without 0G

**Arc extras**
- ☐ Shareable Arc Studio project URL
- ☐ Arc Studio shown in the video
- ☐ Architecture diagram image
- ☐ Bounty named: "Best Smart Contracts with Advanced Stablecoin Logic"

**Chainlink extras**
- ☐ `cre workflow simulate` output (screenshot or video)
- ☐ Path to the workflow code in the README

---

## 13. Judge Q&A
| Question | Answer |
|---|---|
| "Is this a real problem?" | "Barcarès: 3 injured, the investigator couldn't verify the operator because the logs were gone. Orlando: a child needed open-heart surgery, and the case has 4 defendants arguing over defendant-held data. No rule anywhere requires tamper-evident drone logs; India mandated it and then deferred it." |
| "Do drones really use AI for decisions?" | "Yes, ML perception. Amazon's MK30 detects people and obstacles and decides evasive action. Our 0G check mirrors that drop-zone decision. We do not claim drones use chatbots." |
| "Why blockchain?" | "The operator is the only custodian today. Anchors on 0G Chain fix what existed and when. The payout can only be triggered by Chainlink, not by the operator or us." |
| "Isn't 0G just logging here?" | "No. The 0G decision gates the drop. Watch the DENY: the drone doesn't move." |
| "Garbage in, garbage out?" | "True: we prove what was logged and decided, not that the sensors were honest. Missing or broken records count against the operator, and Remote ID cross-checks are on the roadmap." |
| "Who decides fault?" | "Only objective rules: geofence, altitude, unapproved action, broken record, unsafe-wind launch. Everything else goes to the insurer with evidence." |
| "Insurance already exists." | "Yes, and it's mandatory in the EU, UK and India. We pay a fast first-loss amount on clear breaches, ahead of the insurer, with evidence they can trust." |
| "Is it real hardware?" | "Simulation with real physics. 0G's track accepts simulation for every prize except the hardware one. The decision and record layer is the same code a real drone would run." |
| "What's next?" | "The gate on a secure element in PX4/ArduPilot, Remote ID cross-checks, insurer rule sets, and national permit systems like NPNT." |

### Things not to say
| Don't say | Say instead |
|---|---|
| "CHAI made drones land on a crowded roof" | "A debris-strewn roof judged safe up to 68.1% of the time, in simulation" |
| "The operator deleted the logs" | "The logs were no longer on any of three devices" |
| "AI caused these crashes" | "Autonomous system decisions; no report blames an ML model" |
| "Drones let AI approve missions today" | "Drones use ML perception; VLM agents are coming and are hijackable" |
| "Amazon hid data" | "The record had a single custodian" |
| "First blockchain drone black box" | "Others prove logs weren't edited; we add 0G decisions, independent custody and objective payouts" |
| "Victims have no insurance" | "We add a fast first payout on objective breaches" |

---

## 14. Technology stack
| Area | Choice |
|---|---|
| Simulator | Python 3.12, PyBullet 3.2.7, gym-pybullet-drones (no RL extras) |
| Person detector | YOLOv8n (optional; a simulated ground-truth check is the fallback) |
| Officer service | Node.js 24, TypeScript, OpenAI-compatible client to 0G Private Computer |
| 0G Storage | 0G TypeScript storage SDK |
| Crypto | `@noble/hashes`, `@noble/secp256k1`, Web Crypto AES-GCM |
| 0G Chain contracts | Solidity 0.8.x, Foundry or Hardhat |
| Arc contract | Solidity, in Arc Studio |
| Chainlink | CRE TypeScript SDK on Bun, CRE CLI |
| Frontend | Next.js, Three.js (replay), viem |
| Sim ↔ services | WebSocket JSON |

## 15. Repository layout (`D:\SkyProof`)
```
sim/         PyBullet world, scenarios, camera, bridge   (Python 3.12, .venv)
officer/     gate logic, 0G client, record chain, Storage upload (TS)
contracts/   DroneRegistry, FlightLog on 0G Galileo
cre/         Chainlink verdict workflow (TS + Bun)
web/         console, replay, claim page (Next.js)
scripts/     day-0 tests
docs/        this report, research, build report
```

## 16. Current setup status (5 Nov 2026)
| Item | Status |
|---|---|
| Repo created and skeleton pushed | ✅ |
| Python 3.12 + `sim/.venv` | ✅ |
| Microsoft C++ Build Tools + Windows SDK (to compile PyBullet) | ✅ |
| PyBullet + gym-pybullet-drones; D3 test flight | ✅ D3 PASS (4 cm error, 320×240 frame) |
| Foundry | ❌ installer blocked by permissions; install manually or use Hardhat |
| CRE CLI | ☐ install from the CRE docs |
| Credentials (0G API key + credits, Arc Studio, CRE, wallets, faucets) | ☐ teammate collecting |

## 17. Roadmap
- The gate inside a secure element; PX4/ArduPilot module.
- Remote ID and ground-observer cross-checks of recorded positions.
- Threshold key custody, so the operator never holds the only decryption key.
- Insurer-defined rule sets; integration with NPNT / Digital Sky and FAA Part 108 data systems.
- Real hardware flights.

## 18. Sources
Full source list with CONFIRMED / SUSPECTED labels: `docs/Deep_Research_2026-11-05.md` and the research notes in `D:\Projects\skyproof\research_notes\SkyProof drone problem evidence\`.
