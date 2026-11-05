# SkyProof: Build Report

**Project:** SkyProof, accountable AI approval for autonomous drones
**Event:** ETHGlobal Mumbai, November 5–7, 2026
**Sponsor integrations:** 0G (Compute, Storage, Chain) · Arc (USDC escrow, built in Arc Studio) · Chainlink (CRE)
**Document date:** October 31, 2026
**Status:** Ready for build

---

## 1. Executive summary

SkyProof is a control-and-settlement layer for AI-assisted drones. A drone running SkyProof **can't execute a mission command until an AI safety officer approves it**, and that approval is signed inside a trusted execution environment (TEE) on 0G Compute. Every approval, refusal and fallback is chained into a tamper-evident flight record, stored on 0G Storage and anchored on 0G Chain.

Because the drone can't act without a signed record, **the record is complete by construction: a missing or broken record is itself evidence of tampering.** After an incident, a Chainlink CRE workflow independently re-verifies the record and reports a verdict to an escrow contract on Arc. If the record is broken, the victim receives an automatic first-loss payment in USDC from the operator's bond. Every other case is routed to insurer review with a verified evidence pack.

**Core promise:** *No signature, no action. A broken record pays the victim.*

---

## 2. Problem and solution

### 2.1 Problem
Drones are moving to AI-assisted flight beyond the pilot's line of sight. When something goes wrong, the only evidence of what the AI was asked, what it decided and whether the operator obeyed is the operator's own log. That log can be edited, truncated or never produced. Victims wait on slow, adversarial claims processes, and insurers can't price flights they can't verify.

### 2.2 Solution
| Need | SkyProof mechanism |
|---|---|
| Decisions that can't be forged after the fact | AI officer decisions signed inside a 0G TEE, with the raw signature stored per decision |
| A log that can't silently omit events | The drone gate refuses any mission command without a signed approval, so gaps are detectable |
| A log nobody can rewrite | Hash-chained records on 0G Storage, anchored on 0G Chain |
| Safe behaviour when the AI service is unreachable | A pre-approved, deterministic lost-link policy, logged separately and never presented as an AI decision |
| A verdict no single party controls | A Chainlink CRE workflow re-verifies the record and signs the verdict |
| Fast compensation for clear-cut cases | An Arc USDC escrow pays the victim's first-loss amount automatically when the record is broken |

### 2.3 Scope of this build
- **In scope:** a simulated drone in a 3D city environment, the gate, the officer service, the record pipeline, contracts on 0G Chain and Arc, one CRE incident workflow, a mission console, an investigator replay and a victim claim page.
- **Simulated and labelled as such:** the drone and its environment, and the insurer's role.
- **Out of scope:** physical hardware, real-world flight approvals and licensed insurance products.

---

## 3. System architecture

```
┌────────────────────────── Operator side ───────────────────────────┐
│                                                                     │
│  [3D Simulator]  ◄── telemetry / camera ──►  [Flight Computer]      │
│   PyBullet drone, city map,                   autopilot + GATE      │
│   no-fly zones, people, wind                  lost-link policy      │
│                                                    │  ▲             │
│                                     mission cmd    │  │ signed ALLOW│
│                                                    ▼  │ / DENY      │
│                                            [Officer Service]        │
│                                    hard rules → schema → detector   │
│                                    → 0G call → append queue         │
└────────────────────────────────────┬──────────┬────────────────────┘
                                     │          │
               signed request/response          │ records + anchors
                                     ▼          ▼
                    [0G Compute TEE]   [0G Storage]  [0G Chain]
                     safety officer     encrypted     DroneRegistry
                     (TeeML)            records       FlightLog
                                                          │ events
                                                          ▼
                                            [Chainlink CRE incident workflow]
                                            fetch → re-verify → rules → report
                                                          │ DON-signed verdict
                                                          ▼
        [Victim claim page] ──claim──►  [Arc: SkyProofEscrow (Arc Studio)]
                                         bond · incidents · USDC payouts
        [Investigator replay] ◄── rebuilt from 0G Storage records
```

### 3.1 Responsibility split
| Layer | Owns | Never does |
|---|---|---|
| Flight computer and gate | Executes only signed, fresh, unused approvals; runs the lost-link policy | Decide approvals itself |
| Officer service | Hard rules, input validation, 0G calls, record ordering | Execute commands |
| 0G Compute (TEE) | Signed ALLOW/DENY decisions | See or store raw camera frames beyond the request |
| 0G Storage and Chain | Durable records and ordering anchors | Judge fault |
| Chainlink CRE | Independent verification and verdict | Hold funds |
| Arc escrow | Bonds, claims, payouts | Interpret flight data |

---

## 4. Component specifications

### 4.1 Simulator
- **Engine:** `gym-pybullet-drones` (PyBullet), quadrotor model with wind disturbance.
- **World:** a city block map with no-fly polygons (for example an airport zone), rally points, drop zones and pedestrians that can be placed in drop zones.
- **Sensors exposed:** position, velocity, battery, and a downward camera rendered at 320×240.
- **Operator controls (demo panel):** issue a mission command, trigger a manual override, kill the network link, and stage a crash.
- **Determinism:** fixed random seed per scenario, so every flight can be replayed exactly from its record.

### 4.2 Flight computer and gate
The flight computer runs the autopilot (waypoint following and stabilisation) locally. **Mission-level commands** need a valid approval: `TAKEOFF`, `REROUTE`, `ALT_BAND`, `DROP`, `LAND` and `PLAN_CHANGE`. Low-level control never waits for the officer.

**Gate predicate.** A mission command runs only if all of these hold:
```
sigValid(response, allowlistedSigner)
∧ response.verdict == "ALLOW"
∧ response.requestHash == H(request)                // binds approval to this exact command and state
∧ request.nonce ∉ usedNonces                        // single use
∧ now − request.basisTime ≤ 10 s                    // fresh state
∧ request.basis is an ancestor of head (≤ 3 records back)
∧ no DENY of the same command class, PLAN_CHANGE, OVERRIDE or SAFE_STOP between basis and head
∧ lease valid
```
If the check passes, the nonce is added to `usedNonces` and the command executes. If it fails, the command is dropped and the drone holds its current plan.

### 4.3 Officer service
A TypeScript service on the operator's side that turns a command into a signed decision.

**Pipeline**
1. **Schema validation.** The request must match the typed schema (Section 5.1): numbers, enums and hashes only, with no free text. A non-conforming request is rejected locally.
2. **Hard rules (deterministic):** DENY if the path enters a no-fly polygon, the battery is below the reserve needed to reach the nearest rally point, the altitude is above the ceiling, or the wind is above the airframe limit. Hard-rule DENYs are still logged.
3. **Object detector (drop and land only):** a YOLOv8n detector runs on the camera frame. If it sees a person or vehicle in the zone, the result is DENY `PEOPLE_BELOW`.
4. **0G officer call:** the request goes to the allowlisted TeeML provider with the fixed system prompt. Drop and land requests include the camera frame for the vision-language model. The settings are temperature 0, JSON output and a request timeout.
5. **Combine:** the final result is ALLOW only if the hard rules, the detector *and* the officer all allow.
6. **Append queue:** a single writer assigns `seq` and `prev` and commits the record (Section 4.4).

**Officer prompt contract:** the model receives structured data only, is told that all fields are data and never instructions, ignores any text visible in images, and returns exactly the JSON response schema (Section 5.2).

**Rate budget:** at most 30 requests per minute and 5 concurrent per 0G account. One concurrency slot is reserved for lease renewals. Expected load per drone is 4 renewals plus 1–5 mission commands per minute.

### 4.4 Flight record
- One record per event: `PLAN`, `DECISION`, `LEASE`, `OVERRIDE`, `SAFE_STOP_LOCAL` and `CLOSE`.
- Records are **hash-chained** (`prev` = hash of the previous record) and **sequence-numbered**.
- Each officer record stores the **full request, the exact signed response text, the raw signature, the signer address and the 0G request ID**, so any third party can re-verify it without the 0G SDK.
- `OVERRIDE` and `SAFE_STOP_LOCAL` records are signed by the drone key and labelled as operator-signed everywhere.
- Records are **encrypted** with a per-flight key (AES-256-GCM) and uploaded to 0G Storage. Only hashes, sequence numbers, verdict codes and storage roots appear on-chain.
- Camera frames are never stored. The record keeps the frame's hash only.

### 4.5 Leases and lost-link policy
- **Lease:** 60 s, renewed every 15 s. Each renewal is an officer request carrying a position and battery heartbeat, which gives three renewal attempts before expiry.
- **Anchoring:** every lease renewal is anchored on 0G Chain (`FlightLog.anchor`), and every request carries the latest 0G block hash. Timing questions are decided by anchored block times, never by the operator's clock.
- **Lost-link policy** (approved in record #0, committed by hash):
  1. **Link lost, lease still valid:** continue the approved plan. No new mission commands can be approved.
  2. **Lease expired:** fly to the nearest reachable rally point that avoids no-fly polygons and keeps the battery reserve, then land.
  3. **No reachable rally point:** hover 10 s, then land in place.
- Every policy step is logged as `SAFE_STOP_LOCAL{policyHash, step, trajectory}`. **No 0G decision is claimed for it.**

### 4.6 Smart contracts

**0G Chain (Solidity, Foundry)**

`DroneRegistry`
- `registerAirframe(airframeId, operator)`
- `setOfficerAllowlist(signer, composeHash, modelId, promptHash)`, callable by the registry admin (the insurer role) only
- `isAllowedOfficer(signer, promptHash) → bool`
- Enforces one open flight per airframe and keeps verdict counters per airframe.

`FlightLog`
- `openFlight(airframeId, rec0Hash) → flightId`, where `flightId = keccak256(airframeId, rec0Hash)`. Reverts if the airframe already has an open flight.
- `anchor(flightId, seq, headHash, storageRoot)`. `seq` must strictly increase. Emits `Anchored`.
- `closeFlight(flightId, finalHeadHash)`. Emits `FlightClosed`.

**Arc (built and deployed in Arc Studio)**

`SkyProofEscrow`
- **Bond:** `depositBond(airframeId, amount)`. The required bond is `k × cap(airframe)`.
- **Risk-tiered cap:** `cap = baseCap × weightClass × areaClass`, with weight classes (<2 kg, 2–25 kg, >25 kg) and area classes (rural, suburban, urban).
- **Bond lock:** no withdrawal while a flight is open, an incident is open, or within the challenge window after the last flight closed.
- **Incidents:** `openIncident(airframeId, time, place, evidenceHash)` with a refundable USDC deposit. The contract maps airframe and time to the flight that was open.
- **Challenge window:** configurable (24 h in production, 2 minutes in the demo). Claims on the same incident collect during the window.
- **Verdict:** `onReport(incidentId, verdict, reportHash)` is callable **only by the Chainlink CRE forwarder**.
- **Payout:** on `BOND_PAYS` with a single valid claim, the victim receives the cap from the bond. With several claims, or with any `REVIEW` verdict, funds are held for insurer resolution. Deposits are refunded to claims inside the flight's recorded time and place window.

### 4.7 Chainlink CRE incident workflow (TypeScript SDK)
Triggered when the escrow emits `ChallengeWindowClosed`:
1. Read the flight's anchors from 0G Chain over HTTP, then fetch and decrypt the records within the incident time window from 0G Storage, using the per-flight key that the operator releases on a valid incident.
2. **Verify** each officer record: recover the signer from the raw signature with `@noble/secp256k1`, check the signer and prompt hash against the `DroneRegistry` allowlist, check `requestHash`, and check the hash chain and anchors.
3. Apply the settlement rules (Section 6).
4. Write a DON-signed verdict report to `SkyProofEscrow.onReport` on Arc.

### 4.8 User interfaces (Next.js)
| Interface | Purpose |
|---|---|
| **Mission console** | Live 3D view, command buttons, a record panel (✅ ALLOW / ⛔ DENY / ⚠ SAFE_STOP with the 0G request ID), a lease timer and a network-kill toggle |
| **Investigator replay** | Rebuilds a flight from 0G Storage, shows chain integrity per record, and exports an evidence pack |
| **Victim claim page** | Report an incident by airframe ID, upload evidence (only its hash goes on-chain), and receive USDC in an email-login embedded wallet |
| **Escrow dashboard** | Shown in Arc Studio: bonds, open incidents, the challenge window, verdicts and payouts |

---

## 5. Data specifications

### 5.1 Officer request
```json
{
  "v": 1,
  "flightId": "0x…",
  "nonce": "0x<16 bytes>",
  "basis": { "seq": 41, "hash": "0x…" },
  "basisTime": 1762330000,
  "zgBlockHash": "0x…",
  "cmd": { "type": "DROP", "target": [19.0760, 72.8777], "alt": 40 },
  "state": { "pos": [19.0755, 72.8770], "alt": 42, "vel": [3.1, 0.4, 0.0],
             "battery": 0.64, "windMs": 6.2 },
  "planHash": "0x…",
  "contextHash": "0x…",
  "frameHash": "0x…",
  "promptHash": "0x…"
}
```
`requestHash = keccak256(canonicalJSON(request))`

### 5.2 Officer response
```json
{ "verdict": "ALLOW", "code": "OK", "in": "<first 16 hex chars of requestHash>" }
```
Allowed codes: `OK`, `NFZ`, `WIND`, `BATTERY`, `OFF_PLAN`, `PEOPLE_BELOW` and `UNCERTAIN`. The `in` field is needed only if validation task V1 shows the TEE signature covers the response but not the request.

### 5.3 Record
```
{ flightId, seq, prev, type, basis, request, requestHash,
  responseText, signature, signer, zgRequestId, zgBlockHash, localTime }
```

---

## 6. Settlement rules
The CRE workflow evaluates the records within the incident window.

| Verdict | Condition | Outcome |
|---|---|---|
| **BOND_PAYS** | The record is broken: a gap, edit or fork; an invalid signature; a non-allowlisted officer or a wrong prompt hash; a request that breaks the schema; an ALLOW that breaks a hard rule; missing anchors; no valid lease outside a policy-compliant safe stop; a safe stop that deviated from the policy; or a `MANUAL` override active at the incident | The victim receives the first-loss cap from the operator's bond |
| **REVIEW** | Any other case, including a clean record and a policy-compliant safe stop | Funds held. The insurer receives a verified evidence pack |

The rule set is deliberately small. Automatic payment happens only when the evidence is unambiguous and the fault lies in the operator's own record. Neutral emergency overrides (`CLIMB`, `HOVER`, `LAND_NOW`, `RETURN_TO_RALLY`, each under 20 s or ending in a landing) never count against the operator.

---

## 7. Security model

### 7.1 Trust assumptions
| Assumption | Basis |
|---|---|
| The 0G provider's signing key stays inside the TEE | 0G TeeML attestation; compose hash recorded in `DroneRegistry` |
| The officer model and prompt are approved | The admin-controlled allowlist, checked by CRE on every record |
| Unmodified drone firmware enforces the gate | Tamper-evident model, like a tachograph. Hardened firmware is on the roadmap |
| The CRE verdict is honest | DON consensus; the escrow accepts verdicts only from the CRE forwarder |

### 7.2 Threats and controls
| Threat | Control |
|---|---|
| Forged or edited approval | TEE signature over the exact text, re-verified by CRE |
| Omitting events or truncating the log | The gate requires signed approvals, and gaps or missing anchors give `BOND_PAYS` |
| Operator chooses a lenient model or prompt | Admin allowlist of signer, model and prompt hash |
| Manipulative input to the officer | Typed schema, no free text, and schema violations give `BOND_PAYS` |
| Printed-sign attacks on the vision model | An independent object detector must also pass; the prompt ignores image text |
| Replayed approvals | Single-use nonce, a 10 s freshness limit and a used-nonce set |
| Bond withdrawn after an incident | Bond lock until the challenge window and verdict complete |
| Fake or duplicate victims | Deposit, evidence hash, challenge window; more than one claim goes to review |
| Spam incidents forcing decryption | Deposit plus evidence; only records inside the incident window are decrypted |
| Location privacy | Encrypted records, hashes on-chain, frames never stored |

### 7.3 Stated limits
- A fully modified drone can bypass the gate. The system is tamper-evident for unmodified firmware, not tamper-proof.
- The officer proves its decision, not the truth of the sensor data it received.
- SkyProof decides how first-loss compensation is paid. It doesn't replace legal liability or the operator's insurance.

---

## 8. Technology stack
| Area | Choice |
|---|---|
| Simulator | Python 3.11, `gym-pybullet-drones`, PyBullet |
| Object detection | Ultralytics YOLOv8n |
| Officer service | Node.js 20, TypeScript, `@0glabs/0g-serving-broker` |
| Storage | `@0glabs/0g-ts-sdk` |
| Cryptography | `@noble/secp256k1`, `@noble/hashes`, Web Crypto AES-GCM |
| 0G Chain contracts | Solidity 0.8.x, Foundry |
| Arc contracts | Solidity in Arc Studio |
| Chainlink | CRE TypeScript SDK, `cre` CLI (simulation and deployment) |
| Frontend | Next.js 14, Three.js (replay view), viem |
| Sim ↔ services link | WebSocket (JSON messages) |

## 9. Repository layout
```
skyproof/
├── sim/                 # PyBullet world, scenarios, camera, operator panel bridge
├── flight-computer/     # autopilot hooks, gate, lost-link policy
├── officer/             # schema, hard rules, detector, 0G client, append queue
├── record/              # canonical JSON, hashing, encryption, 0G Storage upload, anchoring
├── contracts/
│   ├── zg/              # DroneRegistry, FlightLog (Foundry)
│   └── arc/             # SkyProofEscrow (exported from Arc Studio)
├── cre/                 # incident workflow
├── web/                 # mission console, replay, claim page
├── scenarios/           # demo fixtures (seeded)
└── docs/                # architecture diagram, verification notes
```

---

## 10. Build plan

### Phase 0: Validation (before writing feature code)
| ID | Task | Pass condition | Fallback |
|---|---|---|---|
| V1 | Call a TeeML provider directly and capture the raw signature | Signed bytes identified (request + response, or response only) | Response-only: enforce the `in` echo |
| V2 | Re-verify a stored signature with `@noble/secp256k1` in `cre workflow simulate` | Recovered signer matches the provider | Verify in the replay UI and document it |
| V3 | Measure 0G latency (p50/p99) for text and vision requests | Text p99 under 10 s | Lengthen the lease; use a smaller lease model |
| V4 | Send one image request to a TEE vision model | Valid JSON verdict returned | Send detector output as structured data |
| V5 | CRE writes a report to an Arc testnet receiver deployed from Arc Studio | `onReport` executes | Calldata `settle()` with on-chain `ecrecover` |
| V6 | CRE reads 0G Chain events and Storage content over HTTP | Consensus on the fetched data | Pass the anchors in the trigger payload |

### Phase 1: Core loop
Simulator world and scenarios → flight computer with the gate → officer service (schema, hard rules, detector, 0G call) → append queue and record format.
**Exit criterion:** a full mission flies in the simulator with every mission command gated by a signed 0G decision.

### Phase 2: Record and chain
Encryption and 0G Storage upload → `DroneRegistry` and `FlightLog` deployed on 0G Galileo testnet → lease anchoring → lost-link policy.
**Exit criterion:** a flight's record is rebuilt from 0G Storage and matches its anchors, and a network kill produces a correct `SAFE_STOP_LOCAL` sequence.

### Phase 3: Settlement
`SkyProofEscrow` in Arc Studio → CRE incident workflow → end-to-end `BOND_PAYS` and `REVIEW` paths.
**Exit criterion:** a broken-record incident pays a victim wallet in USDC on Arc testnet through a CRE-signed report.

### Phase 4: Interfaces and demo
Mission console, investigator replay, claim page, architecture diagram, README and recorded demo video.
**Exit criterion:** all three demo scenes run end to end from a clean start.

---

## 11. Testing and acceptance

### 11.1 Automated tests
| Area | Test |
|---|---|
| Gate | An ALLOW for command A doesn't execute command B; a replayed nonce is rejected; a stale basis (>10 s) is rejected; a same-class DENY after the basis blocks execution |
| Concurrency | A lease renewal fires during an officer call slowed by 5 s, and the ALLOW still executes |
| Hard rules | No-fly, battery, altitude and wind each DENY regardless of the model |
| Detector | A pedestrian in the drop zone gives `PEOPLE_BELOW` even when the model says ALLOW |
| Schema | Unknown fields or free text are rejected locally and flagged by CRE |
| Record | A gap, edited record, fork or invalid signature each give `BOND_PAYS` |
| Lost link | A policy-compliant safe stop gives `REVIEW`; a deviated safe stop gives `BOND_PAYS` |
| Escrow | Bond lock, deposit refund rules, a single claim paid, multiple claims held, and `onReport` restricted to the forwarder |
| Allowlist | A record signed by a non-allowlisted signer, or carrying a different prompt hash, gives `BOND_PAYS` |

### 11.2 Acceptance criteria
- Every mission command in a demo flight has a 0G request ID shown in the console and stored in the record.
- Any flight can be replayed deterministically from 0G Storage alone.
- An independent verifier (the CRE workflow) reaches the same verdict as the replay UI for every test fixture.
- No camera frame or plaintext location appears on-chain or in unencrypted storage.

---

## 12. Demonstration (3 minutes)
| Time | Scene | What the audience sees |
|---|---|---|
| 0:00 | **Hook** | "When an AI-flown drone crashes, who can prove what it was told and what it decided? Our drone can't act until a 0G AI officer approves." |
| 0:20 | **Scene 1: prevention** | The plan is approved. A shortcut through the airport zone gets DENY `NFZ` and the drone holds. At the drop point, a pedestrian gets DENY `PEOPLE_BELOW`. Each decision shows its 0G request ID |
| 1:05 | **Scene 2: the gap convicts** | A cheating operator disables the gate, flies an unapproved shortcut and causes an incident. The victim files a claim by airframe ID. The replay shows ❌ GAP. CRE reports `BOND_PAYS`, and USDC arrives in the victim's email wallet. The Arc transaction is shown in Arc Studio |
| 2:05 | **Scene 3: AI unreachable** | The network is cut. The lease runs down, the drone continues its plan, then diverts to a rally point and lands. The replay shows `SAFE_STOP_LOCAL`, labelled "pre-approved local policy, no 0G decision claimed" |
| 2:45 | **Close** | "No signature, no action. A broken record pays the victim." |

A full-length backup recording is prepared before judging.

---

## 13. Sponsor deliverables
| Sponsor | Requirement | Delivered by |
|---|---|---|
| **0G: Physical AI** | 0G call in the decision loop | The gate needs a TEE-signed officer decision for every mission command |
| | Episode log on 0G Storage with a request ID per decision | Encrypted records with `zgRequestId`, anchored on 0G Chain |
| | Replayable simulation | Seeded simulator plus the investigator replay rebuilt from Storage |
| | Safe stop when 0G is unreachable, not faked | The lost-link policy, logged as `SAFE_STOP_LOCAL` with no 0G decision claimed |
| **Arc: Advanced Stablecoin Logic** | Built and shown in Arc Studio; frontend, backend, diagram, video | `SkyProofEscrow`: risk-tiered caps, bond lock, deposits, challenge window, CRE-gated USDC payouts |
| **Chainlink: CRE** | Workflow combining on-chain data and external computation | The incident workflow: 0G reads, signature re-verification, rule engine, DON-signed report to Arc |

**Submission package:** public repository, README (first line: *"The drone cannot act on a mission command until a 0G AI officer approves it."*), architecture diagram, demo video, deployed contract addresses, sample 0G request IDs and storage roots, the Arc Studio project link, and a note on what the TEE signature covers (from V1).

---

## 14. Technical risks
| Risk | Impact | Mitigation |
|---|---|---|
| TEE signature coverage is undocumented | Weaker binding of approval to request | V1; the `in` echo for response-only signing |
| 0G latency or rate limiting | Spurious lease expiry | V3; 60 s lease with 3 renewal attempts; a reserved concurrency slot |
| Vision request format | No VLM in the loop | V4; the detector always runs, and its output can be sent as data |
| CRE ↔ Arc integration | No automated payout | V5; the `settle()` fallback with on-chain signature checks |
| Live network at the venue | Demo interruption | Scene 3 is designed around a network cut; a backup video is ready |

---

## 15. Roadmap
- The gate inside a secure element with signed firmware; a PX4/ArduPilot module.
- Independent observer networks (RF direction-finding, cameras) to cross-check recorded positions.
- Verified weather sources for automatic no-fault settlement.
- Threshold or confidential-compute key custody, so the operator never has to release a decryption key.
- Insurer-defined rule sets and pricing; integration with national drone-permission systems.
- Multi-provider officer quorum and key rotation.
- Real hardware flights.

---

## Appendix: Glossary
| Term | Meaning |
|---|---|
| **TEE** | Trusted execution environment: a sealed area of a processor whose code and keys the machine's owner can't alter |
| **Safety officer** | The AI model on 0G Compute that approves or refuses mission commands |
| **Gate** | Flight-computer logic that executes a mission command only with a valid signed approval |
| **Lease** | A signed permission to keep flying the approved plan for 60 s |
| **Anchor** | The latest record hash written to 0G Chain, fixing the order and time of the record |
| **CRE** | Chainlink Runtime Environment: workflows run and signed by a decentralised node network |
| **First-loss payment** | A small, capped, fast payment to a victim. Larger claims go through the insurer |
