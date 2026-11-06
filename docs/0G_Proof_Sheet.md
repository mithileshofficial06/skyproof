# SkyProof: proof of 0G's four requirements

**Track:** 0G · Physical AI: Agents with a Body · **Network:** 0G Galileo testnet
**Contracts:** FlightLog [`0x2E6F…cBa5`](https://chainscan-galileo.0g.ai/address/0x2E6F0f6f3121e3aA7984ffC292f80E75c937cBa5) · DroneRegistry [`0xC3e0…1Adf`](https://chainscan-galileo.0g.ai/address/0xC3e0C4a5848c6b8754820286AF9805F6c4ca1Adf) · Operator [`0x69A5…A12A`](https://chainscan-galileo.0g.ai/address/0x69A5160E8bf27A2a9D8d17eaff0De079CfdFA12A)

**Showcase flight:** `SKY-001-full-1793927431338`: 52 records, 13 0G decisions, sealed in 4 segments.

| # | 0G requirement | Met | Strongest proof |
|---|---|---|---|
| 1 | 0G call inside the decision loop | ✅ | The drone executes TAKEOFF, REROUTE, DROP and LAND **only** on a fresh 0G ALLOW for that exact request |
| 2 | Episode log on 0G Storage, with a request ID per decision | ✅ | 4 encrypted segments on 0G Storage; each DECISION record carries its 0G request ID |
| 3 | Replayable simulation | ✅ | `pnpm replay` rebuilds the flight from 0G Storage and 0G Chain; edits and deletions are caught |
| 4 | Safe stop that never fakes a decision | ✅ | With 0G cut: `NO_DECISION`, then HOLD → DIVERT → LAND, recorded as "no 0G decision claimed" |

All 10 transactions linked below were re-checked on 6 Nov 2026: each has `status = 1`.

---

## 1. 0G is inside the decision loop

**How it works.** Before every mission command, the flight computer sends the command, its state and the camera frame to the officer service. The officer calls 0G Compute (vision model `qwen3.8-flash`). The drone moves only if the answer is **ALLOW**, with the same nonce, the same request hash, issued within 10 s and used once. DENY, NO_DECISION, stale or mismatched answers mean the drone doesn't move.

For in-flight situations (people under the path, an obstacle, a blocked drop zone), the permit first vetoes any illegal option, and then **0G chooses** among the legal ones.

| Evidence | Where |
|---|---|
| Drone-side gate: nonce, request hash, freshness, single use | [sim/skyproof_sim/gate.py](../sim/skyproof_sim/gate.py) |
| "ALLOW or safe-stop" loop | [sim/mission.py](../sim/mission.py) `command()` |
| Officer: hard rules → 0G vision → (optional stricter person detector) → record | [officer/src/server.ts](../officer/src/server.ts) `decide()` / `choose()` |
| 0G Compute client (request ID + provider taken from `x_0g_trace`) | [officer/src/zg.ts](../officer/src/zg.ts) |
| A live 0G call: HTTP 200 in 2.6 s, ALLOW, request ID `6f31e9e8-…`, provider `0x0000…8044` | [proofs/logs/0g-private-computer-live-decision.txt](../proofs/logs/0g-private-computer-live-decision.txt) · screenshot `proofs/0g/12` |

**Decisions 0G made in the showcase flight** (from the replay, every one with its 0G request ID):

| Record | Asked | 0G answered | 0G request ID |
|---|---|---|---|
| 2 | TAKEOFF | ALLOW | `2c868406-fe72-4585-a629-65f729711493` |
| 8 | People under the path | **SHIFT_LEFT** | `2afb1d54-f654-49c7-983b-b5f9994f5348` |
| 17 | Obstacle (crane) | **CLIMB** | `f26bfbc1-09cc-443e-a319-a0db2146ac3c` |
| 24 | Drop zone blocked | **BACKUP_ZONE** | `33c057e3-b981-4c95-9f00-1cbdc8048487` |
| 40 | DROP | ALLOW | `0d03e756-965e-4049-b2a1-f488cee0544b` |

## 2. The episode log is on 0G Storage, with a request ID per decision

**How it works.** Each record (decision, action, state, safe stop) is signed by the operator key and hash-chained to the previous record. During the flight, records are encrypted per flight (AES-256-GCM) and uploaded to **0G Storage** in segments. After each upload, the segment's **storage root and the latest record hash** are anchored on **0G Chain** (`FlightLog`). Every DECISION record stores `zg.requestId`, `provider`, `model`, `latencyMs`, `promptHash` and the camera `frameHash`.

| Step | Transaction |
|---|---|
| Flight opened under the signed permit | [`openFlight`](https://chainscan-galileo.0g.ai/tx/0xb51d13405ac99cf2d452a78138bed311026417d55aee5d131560321c8cf33273) |
| Segment 0 uploaded to 0G Storage | [upload tx](https://chainscan-galileo.0g.ai/tx/0x8f825e69d8ef23e4667df3dcf9523409f960e5c55b19fe210b2cdd8247f0e29e) |
| Segment 0 anchored (head hash + storage root) | [anchor tx](https://chainscan-galileo.0g.ai/tx/0x3affd4a74e5c007d4936641294f96bb51e7cb8a9e6b5f4177008db2d84bb60a0) |
| Segment 2 uploaded to 0G Storage | [upload tx](https://chainscan-galileo.0g.ai/tx/0xa2408face088d736cef572fcc6041bced9eb36951b13046413cd82cc37d47ff0) |
| Segment 2 anchored | [anchor tx](https://chainscan-galileo.0g.ai/tx/0x89d11f0fd5c161e50e1e87007624fd6e1814919d8723d56956ed91446cdd7f27) |
| Flight closed with the final anchor | [`closeFlight`](https://chainscan-galileo.0g.ai/tx/0xbee257c9e540e6d557c310f1832b645ae0abc4aa031acf4b9aea3431c57f64a6) |

Storage roots for the 4 segments: `0x14cc130e…`, `0x7795023a…`, `0x7ee4bf83…`, `0xff756422…`. Look any of them up on [storagescan-galileo.0g.ai](https://storagescan-galileo.0g.ai).

Code: [officer/src/record.ts](../officer/src/record.ts) (sign and chain) · [officer/src/sealer.ts](../officer/src/sealer.ts) (encrypt, upload, anchor) · [officer/src/crypto.ts](../officer/src/crypto.ts) · [contracts/contracts/FlightLog.sol](../contracts/contracts/FlightLog.sol). Screenshots: `proofs/0g/05`–`08`.

## 3. The simulation is replayable from 0G

**How it works.** `pnpm replay <flight>` reads the anchors from 0G Chain, downloads each segment from 0G Storage by its root, decrypts it with the flight key, and checks four things: the hash chain, each record's signature, every anchor head, and the permit registered on 0G Chain. No local copy of the record is used.

| Proof | Result |
|---|---|
| Full replay ([log](../proofs/logs/0g-replay-full-flight.txt), screenshot `proofs/0g/09`) | 4 segments from 0G Storage, 52 records, 13 decisions, **"intact, every 0G Chain anchor matches"** |
| Tamper test: change one 0G DENY to ALLOW ([log](../proofs/logs/0g-replay-tamper-detected.txt), `0g/10`) | **Caught:** `B5_RECORD_BROKEN: record 44 was edited (hash mismatch)` |
| Delete test: remove one record ([log](../proofs/logs/0g-replay-delete-detected.txt), `0g/11`) | **Caught:** missing record, plus 4 anchors with no matching record |
| In the browser: `/flights/SKY-001-full-1793927431338` → *Verify genuine record* / *Change DENY → ALLOW* | Green, then red. Anchors are read live from 0G Chain |

The 3D replay page shows the flight path with each 0G decision at the point where it was made (`proofs/web-app/03`).

## 4. A safe stop that never fakes a decision

**How it works.** If 0G can't be reached, the officer returns `NO_DECISION` / `ZG_UNREACHABLE`, with source `NONE` and no request ID. It never makes up an ALLOW. The drone hovers and retries. If no ALLOW arrives within the retry window (15 s of simulation time), it runs a **pre-approved local safe stop** (HOLD_EXPIRED → DIVERT to a rally point → LAND). Each step is recorded as a `safe_stop` record, not a decision. Because no action was taken without an ALLOW, the independent judge's rule B3 stays clean.

**Proof flight:** `SKY-001-network_down-1793918402552` (link to 0G cut at 4.5 s, before the drop):

```
4.5 s  link to 0G cut
4.5 s  ASKED 0G: may the drone drop the package?  -> NO_DECISION (ZG_UNREACHABLE), decided by nobody   (x6)
5.1 s  SAFETY FALLBACK: HOLD_EXPIRED   pre-approved local action; no 0G decision was claimed
5.1 s  SAFETY FALLBACK: DIVERT to rally point R2
5.2 s  SAFETY FALLBACK: LAND at R2
       9 decisions requested, 3 answered by 0G, 0 actions without approval; record intact
```

| Evidence | Where |
|---|---|
| Sealed on 0G Chain | [`openFlight`](https://chainscan-galileo.0g.ai/tx/0x0ca4b9af87cc214b4fb7f8029f319a24adbebe2a006cd32d2ea56e38eb7742ab) · [anchor (records 0–24)](https://chainscan-galileo.0g.ai/tx/0x8a3a34eb9c33e9c26c0e559c286b6999ab7e5e797f24319c9ffec8c9c1671629) |
| Full plain-English record | [reports/flights/SKY-001-network_down-1793918402552.txt](../reports/flights/SKY-001-network_down-1793918402552.txt) |
| Officer: `ZgUnreachable` → `NO_DECISION`, no 0G fields written | [officer/src/server.ts](../officer/src/server.ts) `decide()` |
| Drone: safe stop with no 0G involved | [sim/mission.py](../sim/mission.py) `safe_stop()` |
| Live | `/live` → press **Cut 0G** |

---

## What we don't claim

- **Not TEE-attested.** Calls go through 0G's inference router (`router-api.0g.ai`). The response headers say `x-0g-e2ee: none` with a provider address and a request ID. We record those per decision, but we don't call the inference "verified".
- **The model can be wrong.** It isn't trusted alone: the permit vetoes illegal options first, a separate person detector can only make a drop stricter, and every input (frame hash, prompt hash) is on the record, so a bad decision can be proven afterwards.
- **The decryption key belongs to the operator.** The ciphertext and fingerprints are public on 0G; the per-flight key is released for a claim.
- **Simulation:** PyBullet physics at simulator scale. The decision, recording and sealing code is what a real drone would run.
