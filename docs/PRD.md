# SkyProof: Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | SkyProof: an independent black box for autonomous delivery drones, with automatic compensation |
| **One line** | 0G decides and records. Chainlink judges. Arc pays. |
| **Event** | ETHGlobal Mumbai, 5–7 Nov 2026 |
| **Tracks** | 0G "Physical AI: Agents with a Body" · Arc "Best Smart Contracts with Advanced Stablecoin Logic, in Arc Studio" · Chainlink "Best workflow with CRE" |
| **Status** | Built and running on testnets; hosted at https://sky-proof.vercel.app |
| **Related** | [TRD](TRD.md) · [Architecture](Architecture.md) · [Sponsor tracks](Sponsor_Tracks.md) · [Implementation plan](Implementation_Plan.md) |

---

## 1. Problem

Delivery drones already make safety decisions by themselves: whether it is safe to drop a package, when to land, how to avoid an obstacle. When one of those decisions hurts someone:

1. **The only record belongs to the operator being investigated.** It can be edited, lost or withheld.
2. **Nobody can prove what the drone decided, or why.** "The drone responded as designed" cannot be checked.
3. **The victim has to fight for compensation**, usually through the operator's own insurer, with no evidence of their own.

**Evidence that the problem is real**
- *BEA (French air-accident bureau) report 2019-0416:* a drone fell on a festival crowd in Barcarès, injuring 3 people. The operator blamed a "battery failure", but investigators could not verify it because *"the flight logs were no longer present on the drone, the pilot's tablet or the cameraman's phone."*
- Delivery-drone programmes are scaling (Amazon Prime Air, Wing, Zipline). Regulators such as the FAA and NTSB already investigate drone incidents, and depend on operator-supplied data.

## 2. Users

| User | Need | What they must NOT have to deal with |
|---|---|---|
| **Victim** (person hurt, property damaged) | Report what happened, see progress, get paid fairly and fast | hashes, chains, bonds, CRE, flight replays |
| **Insurer / claims reviewer** | Decide unclear claims quickly with trustworthy evidence | raw records, terminal commands |
| **Drone operator** | Prove its drones behaved; watch flights; keep an auditable record | — (technical user) |
| **Regulator / auditor / journalist** | Check any flight independently | trusting the operator's server |
| **Hackathon judge** | Try every integration end to end from a link | installing anything except MetaMask |

## 3. Goals and non-goals

**Goals**
- G1. Every safety-relevant drone action is approved by an AI running on 0G, with a verifiable receipt.
- G2. The flight record is tamper-evident, stored outside the operator's control, and verifiable by anyone.
- G3. A neutral, automatic judge decides claims using objective rules.
- G4. Victims are paid automatically in USDC when a rule was broken; unclear claims go to a human with a written reason.
- G5. Everything is understandable by non-technical users.

**Non-goals (for this hackathon)**
- Real drone hardware (a PyBullet simulation is used, which the 0G track allows).
- Proving that sensors told the truth (SkyProof proves what was recorded and decided).
- Real-world insurance licensing, KYC or fiat payouts.

## 4. User stories and acceptance criteria

| # | Story | Acceptance criteria | Status |
|---|---|---|---|
| U1 | As the drone, I must get 0G's approval before each take-off, drop, landing or reroute | Action blocked without a fresh (≤ 10 s), matching, single-use 0G ALLOW; request id recorded | Done |
| U2 | As the drone, when 0G is unreachable I must stop safely, never fake approval | HOLD → DIVERT → LAND recorded as `SAFE_STOP_LOCAL`, "no 0G decision claimed" | Done |
| U3 | As anyone, I can verify a flight was not edited | Browser re-checks the record against 0G Chain anchors; any edit fails | Done |
| U4 | As a victim, I can report a problem in 3 steps | What happened → wallet → send; claim number shown | Done |
| U5 | As a victim, I am paid automatically if the drone broke a rule | CRE verdict BREACH → USDC cap + deposit to victim in one tx | Done (claim #10) |
| U6 | As a victim, I can follow my claim in plain words | Track page timeline: Received → Waiting → Check → Decision → Paid | Done |
| U7 | As an insurer, I can decide held claims with clear evidence | Inbox; complaint vs record side by side; map; approve/reject with mandatory reason (stored on 0G, visible to victim) | Done |
| U8 | As a judge, I can start a real flight from the hosted site | Start flight button; fixed scenarios; one at a time; daily cap | Done |
| U9 | As a victim who left the page, my claim is still judged | Runner closes ended windows and runs the judge | Done (claim #9) |

## 5. Functional requirements

| ID | Requirement |
|---|---|
| F1 | The drone gate refuses any action without a fresh, request-bound, single-use 0G decision |
| F2 | Permit hard rules (geofence, no-fly zones, altitude ceiling, wind, battery reserve) veto illegal options before 0G is asked |
| F3 | A local person-detector may only make a decision stricter (ALLOW → DENY) |
| F4 | Every record is canonical JSON, keccak-256 hashed, linked to the previous record and signed by the operator |
| F5 | Records are AES-256-GCM encrypted and uploaded to 0G Storage every 15 s during the flight; each segment's head hash + storage root is anchored on 0G Chain |
| F6 | A claim needs a 1 USDC deposit and an active drone (bond ≥ cap) |
| F7 | The CRE judge verifies the record independently and applies rules B1–B6, then writes a 128-byte verdict through the CRE forwarder |
| F8 | BREACH pays the cap from the operator bond and refunds the deposit; REVIEW holds the claim for the insurer |
| F9 | Insurer decisions require a written reason, signed and stored on 0G Storage |
| F10 | Timeouts: no verdict in 7 days or no insurer decision in 30 days → deposit returned |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | 0G answer ~2–3 s; decision timeout 9 s; approval valid 10 s |
| Reliability | Network loss never crashes the flight computer; flights safe-stop; sealing retries |
| Security | No secrets in the repo or website; fixed command list for remote starts; drone token |
| Privacy | Records encrypted on 0G Storage |
| Usability | Victim and insurer pages free of technical terms; tech under "Technical details" |
| Accessibility | Status shown by colour + icon + word; keyboard focus; reduced-motion support |
| Performance | Production build; pages < 0.2 s from the server |

## 7. Success metrics (hackathon)

- All sponsor qualification requirements met with on-chain evidence (see [Sponsor_Tracks.md](Sponsor_Tracks.md)).
- A judge can, from the hosted link alone: watch 0G decide live, verify a record, and see a claim paid automatically.
- Achieved so far: 35+ sealed flights, 1,000+ sealed records, 260+ 0G decisions, 10 claims judged on Arc.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wi-Fi drop during the demo | Safe stop by design; phone hotspot; recorded flights work without the laptop |
| Operator bond runs out | Top up before judging; drone shows "inactive" clearly when it does |
| 0G compute not TEE-attested | Stated openly; next step: serving-broker `processResponse()` verification |
| CRE not on a DON | Simulation with real broadcast writes (allowed by the track); stated openly |
