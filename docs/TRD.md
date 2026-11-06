# SkyProof: Technical Requirements Document (TRD)

Related: [PRD](PRD.md) · [Architecture](Architecture.md) · [Deployments](Deployments.md) · [Setup](Setup.md)

---

## 1. Components

| Component | Language / stack | Path | Runs on |
|---|---|---|---|
| Drone simulator + safety gate | Python 3.12, PyBullet 3.2.7, gym-pybullet-drones | `sim/` | operator machine |
| Officer (flight computer service) | TypeScript, Node 22+, ethers 6, ws | `officer/src/server.ts` | operator machine, port 8787 (WebSocket) |
| Evidence server | TypeScript, Node | `officer/src/evidence.ts` | operator machine, port 8788 (HTTP) |
| CRE auto-runner | TypeScript, Node, CRE CLI | `officer/src/cre-runner.ts` | operator machine |
| CRE judge workflow | TypeScript (CRE SDK, WASM via Bun) | `cre/judge/verdict/` | CRE CLI simulation (`--broadcast`) |
| 0G contracts | Solidity, Hardhat | `contracts/contracts/` | 0G Galileo (16602) |
| Arc escrow | Solidity (Arc Studio) | `contracts/arc/SkyProofEscrow.sol` | Arc Testnet (5042002) |
| Website | Next.js 15, React 19, R3F, viem | `web/` | Vercel |

## 2. External dependencies

| Dependency | Endpoint | Used for |
|---|---|---|
| 0G Private Computer | `https://router-api.0g.ai/v1`, model `0gm-1.0-35b-a3b` (vision, **TEE-attested: TeeML, Intel TDX, verifier dstack**; responses `x-0g-e2ee: sealed`; thinking off via `chat_template_kwargs`) | decisions |
| 0G Storage | indexer `https://indexer-storage-testnet-turbo.0g.ai`, `@0gfoundation/0g-storage-ts-sdk` | encrypted record segments, evidence, insurer reasons |
| 0G Chain | `https://evmrpc-testnet.0g.ai` (chain 16602) | registry, flight anchors |
| Arc Testnet | `https://rpc.testnet.arc.network` (chain 5042002) | escrow, USDC |
| Chainlink CRE | CRE CLI v1.39, forwarder `0x6E9EE680…DC1` on Arc | judge workflow |
| Open-Meteo | hourly wind, `past_days=3` | independent weather check (rule B6) |

## 3. The decision loop (0G)

### 3.1 Request
The simulator sends the officer `{type: "request", body, frame}`:
- `body` = canonical JSON `{nonce, cmd: {type: TAKEOFF|DROP|LAND|REROUTE, …}, state: {pos, alt, vel, battery, windMs, t}, peopleInZone}`
- `frame` = JPEG camera image (base64)
- Situations (`OBSTACLE`, `PEOPLE_UNDER_PATH`, `CHOOSE_DROP_SPOT`, `EMERGENCY`, `ZONE_BLOCKED`) use `{type: "situation"}` with a menu of options.

### 3.2 Officer pipeline (`decide()` / `choose()` in `officer/src/server.ts`)
1. `requestHash = sha256(body)`.
2. Permit hard rules (`officer/src/rules.ts`): geofence, no-fly polygons, altitude ceiling, wind limit, battery reserve. Illegal → DENY (source `HARD_RULES`), or vetoed options for situations.
3. 0G call (`officer/src/zg.ts`): image + prompt → ALLOW/DENY or an option id; timeout 8 s. Recorded: `requestId`, `provider`, `model`, `latencyMs`, `promptHash`, `frameHash`, `e2ee` (the `x-0g-e2ee` header, `sealed`) and `tee` (`attested`, `verifiability`, `teeType`, `verifier` from 0G's model registry). The officer refuses to start if its model is not the permit's `visionModel`.
4. Local detector: may turn ALLOW into DENY (source `0G+DETECTOR`), never the reverse.
5. 0G unreachable → `NO_DECISION ZG_UNREACHABLE`, source `NONE`. Never a made-up answer.
6. A `DECISION` record is appended; the reply carries `{nonce, requestHash, verdict, decisionHash, zgRequestId}`.

### 3.3 Gate (`sim/skyproof_sim/gate.py`)
| Constant | Value | Meaning |
|---|---|---|
| `FRESH_S` | 10 s | an approval older than this is refused |
| `DECISION_TIMEOUT_S` | 9 s | wait for one 0G answer |
| matching | nonce + requestHash | the answer must be for this exact request |
| single use | yes | one approval → one action |

No valid ALLOW in time → `SAFE_STOP_LOCAL`: HOLD → DIVERT (rally point) → LAND, each recorded with "pre-approved local policy, no 0G decision claimed".

## 4. The flight record (0G Storage + 0G Chain)

### 4.1 Record format
```
{ flightId, seq, prev, type, body, localTime, hash, sig }
hash = keccak256(canonicalJSON(record without hash, sig))
sig  = operator secp256k1 signature over hash
prev = hash of record seq-1 (0x00…00 for seq 0)
```
Types: `PERMIT` (seq 0: permit, permitHash, model, prompt hashes), `SCENE`, `EVENT`, `DECISION`, `ACTION` (with `decisionHash`), `STATE` (sample batches, kept at ~2 Hz, flushed every 5 s), `SAFE_STOP_LOCAL`, `OVERRIDE`, `CLOSE`.

### 4.2 Sealing (`officer/src/sealer.ts`)
- `openFlight(airframeId, permitHash, rec0Hash)` on FlightLog at take-off.
- Every **15 s** (`CUT_EVERY_MS`): new records → JSONL segment → **AES-256-GCM** (per-flight key in `officer/.tmp/keys/`, AAD binds flight + segment) → 0G Storage upload → `anchor(flightId, seq, head, storageRoot)`.
- At landing: last segment + `closeFlight(flightId, finalSeq, finalHead, storageRoot)`.
- Failures (network) keep records locally and retry on the next cut. The officer never crashes on network errors.

### 4.3 Contracts on 0G Chain
| Contract | Key functions |
|---|---|
| `DroneRegistry` | `registerAirframe`, `setPermit(airframeId, permitHash, validFrom, validTo)`, `setModelAllowlist(modelId, promptHash, allowed)`, `isAllowedModel`, `permitValid` |
| `FlightLog` | `openFlight`, `anchor`, `closeFlight`, `getAnchors`, `anchorCount`, `flights(id)`, `openFlightOf(airframe)` |

## 5. Claims and payouts (Arc)

`SkyProofEscrow` (Arc Studio), USDC 6 decimals; USDC also pays gas on Arc.

| Parameter | Default | Setter |
|---|---|---|
| Payout cap | 5 USDC per airframe | `registerAirframe` |
| Claim deposit | 1 USDC | `setClaimDeposit` |
| Claim window | 120 s | `setClaimWindow` |
| Verdict timeout | 7 days | `setVerdictTimeout` |
| Held timeout | 30 days | `setHeldTimeout` |

**State machine:** `Open → WindowClosed → (Paid | Held) → Resolved`, plus `Expired` from Open/WindowClosed (no verdict in 7 days) or Held (no decision in 30 days).

| Function | Who | Effect |
|---|---|---|
| `depositBond` / `withdrawBond` | operator | bond; withdraw has a cooldown after the last claim |
| `isActive(airframe)` | anyone | bond ≥ cap |
| `openClaim(airframe, incidentTime, lat, lon, evidenceHash)` | victim | pulls deposit; joins/opens incident |
| `closeClaimWindow(claimId)` | anyone, after window | emits **`ClaimWindowClosed`** (CRE trigger) |
| `onReport(metadata, report)` | **CRE forwarder only** | 128-byte report `(claimId, verdict, breachCode, reportHash)`; BREACH pays, REVIEW holds |
| `resolveHeld(claimId, approve)` | insurer | approve pays / reject forfeits deposit |
| `expireClaim`, `expireHeld` | anyone after timeout | deposit back to victim |
| `withdrawCredit` | recipient | pull-payment fallback if a push transfer fails |

## 6. The judge (Chainlink CRE)

`cre/judge/verdict/workflow.ts` + `rules.ts`.

1. **Trigger:** EVM log `ClaimWindowClosed` on the escrow (Arc).
2. **Find the flight:** `GET {evidenceUrl}/lookup?airframe&t` → verify on 0G Chain (`flights(id)` covers the incident time) → fallback `openFlightOf(airframe)`.
3. **Read anchors** from FlightLog (EVM read on 0G Galileo).
4. **Get the record:** `GET {evidenceUrl}/evidence/{chainFlightId}` inside the node's HTTP callback; each node verifies: hash chain, operator signatures, every anchor, ends with `CLOSE`, permit hash. Missing/unreadable/withheld → B5.
5. **Rules:** B1 geofence (sample-to-sample interpolation), B2 altitude, B3 unapproved action (matching, fresh ≤ 10 s, single-use), B4 override on DENY, B5 record broken, B6 unsafe wind launch (recorded wind; and Open-Meteo at the take-off hour, +2 m/s margin).
6. **Consensus:** `consensusIdenticalAggregation` over the compact result.
7. **Write:** report → CRE forwarder → `onReport`.

**Auto-runner** (`officer/src/cre-runner.ts`): polls Arc logs every 6 s (one `eth_getLogs` per 2,000 blocks), warms the evidence host (lookup + record), runs `cre workflow simulate verdict --non-interactive --trigger-index 0 --evm-tx-hash <tx> --evm-event-index <pos> --broadcast -T staging-settings`, retries once, and closes ended claim windows itself (20 s grace).

## 7. Evidence server API (`officer/src/evidence.ts`, port 8788)

| Method + path | Purpose |
|---|---|
| `GET /lookup?airframe=&t=` | which sealed flight covers time t (cached, time-window filtered) |
| `GET /evidence/{chainFlightId}` | records rebuilt from 0G Storage (decrypted) for the judge |
| `POST /claim-evidence` | victim statement + photos → 0G Storage → evidence hash |
| `GET /claim-evidence/{hash}` | victim bundle (re-hashed by the insurer page) |
| `POST /decision` | insurer reason, signed, checked against the Arc `HeldResolved` event → 0G Storage |
| `GET /decision/{claimId}` | the insurer's reason |
| `GET /site/flights/{file}` | flights published after the website was deployed (validated file names) |

CORS `*`; body limit 6 MB.

## 8. Officer WebSocket protocol (port 8787)

| Message | From | Notes |
|---|---|---|
| `watch` | website | subscribe; reply `watching` with permit + `sim` status |
| `start {scenario, passcode?}` | website | fixed list; one at a time; daily cap `DEMO_MAX_FLIGHTS`; optional `DEMO_PASSCODE` |
| `control {network, passcode?}` | website | cut / restore the 0G link (demo) |
| `hello {scenario, token}` | simulator | **token required** (per-run `DRONE_TOKEN`) |
| `request`, `situation`, `scene`, `event`, `telemetry`, `action`, `safe_stop`, `override`, `close` | simulator only | rejected from anyone without the drone token |
| broadcasts | officer | `flight`, `decision`, `choice`, `telemetry`, `action`, `safe_stop`, `sealed`, `closed`, `published`, `sim` |

## 9. Website

| Route | Audience | Data |
|---|---|---|
| `/` | everyone | role cards, story, live verification against 0G Chain |
| `/claim` | victim | 3 steps; viem → Arc escrow; evidence → evidence server |
| `/track` | victim | escrow `claims(id)` + insurer reason |
| `/insurer` | insurer | held claims, record vs complaint, map, approve/reject |
| `/operator`, `/live`, `/flights`, `/flights/[id]`, `/experience` | operator / auditor | live WebSocket, published flights, 3D replays |

Env: `NEXT_PUBLIC_OFFICER_WS`, `NEXT_PUBLIC_EVIDENCE_URL`, `NEXT_PUBLIC_ARC_ESCROW` (all optional).

## 10. Security requirements

| Requirement | Implementation |
|---|---|
| No secret in repo/site | `.env`, `cre/judge/.env`, `officer/.tmp/` git-ignored; pre-commit secret scan against real key values |
| Remote starts can't run arbitrary code | fixed scenario list; `spawn` with an argument array (no shell); 6-minute kill timer |
| Fake drone | per-run token written to `.tmp/drone.token` and passed to spawned simulators |
| Brute force (if passcode on) | constant-time compare; 10 wrong per 10 min |
| Path traversal | evidence file names validated by regex |
| Verdict spoofing | `onReport` only from the forwarder |
| Withholding | B5 breach |

## 11. Tests

| Suite | Command | Count |
|---|---|---|
| web (vitest) | `cd web; pnpm test` | 28 |
| officer (node:test) | `cd officer; pnpm test` | 8 |
| CRE rules (bun) | `cd cre/judge/verdict; bun test` | 9 |
| contracts (hardhat) | `cd contracts; pnpm test` | 8 |

Hosted end-to-end run: [E2E_Test_Report_2026-11-07.md](E2E_Test_Report_2026-11-07.md).
