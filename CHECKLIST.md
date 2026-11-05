# SkyProof: Full Checklist (start to finish)

✅ done · ⏳ in progress / partly done · ⬜ to do · 👤 needs you or a teammate

---

## Stage 0: Setup
| # | Step | Status |
|---|---|---|
| 0.1 | Create GitHub repo and connect `D:\SkyProof` | ✅ |
| 0.2 | Install Git, Node 24, pnpm, Bun, VS Code | ✅ (already there) |
| 0.3 | Install Python 3.12 + `sim\.venv` | ✅ |
| 0.4 | Install Microsoft C++ Build Tools + Windows SDK (needed to compile PyBullet) | ✅ |
| 0.5 | Install PyBullet + gym-pybullet-drones (no PyTorch) | ✅ |
| 0.6 | Hardhat set up in `contracts/` for 0G Galileo | ✅ |
| 0.7 | Chainlink CRE CLI installed and logged in | ✅ |
| 0.8 | MetaMask installed | ✅ |
| 0.9 | `.env`: 0G API key, base URL, vision model, deployer private key | ✅ |
| 0.10 | Deployer wallet funded with 0G testnet tokens | ✅ (0.5 0G) |
| 0.11 | 👤 Operator + victim wallets created; keys in `.env` | ⬜ |
| 0.12 | 👤 Arc testnet USDC for deployer, operator, victim (faucet.circle.com) | ⬜ |
| 0.13 | 👤 Arc Studio login + empty "SkyProof" project + share link | ⬜ |
| 0.14 | 👤 Ask the 0G booth: is a "Verified" vision model OK, or must it be TEE? | ⬜ |
| 0.15 | 👤 Push pending commits: `cd D:\SkyProof` then `git push` | ⬜ |

---

## Stage 1: Day-0 tests
| # | Test | How to run | Status |
|---|---|---|---|
| D1 | 0G vision decision (photo → ALLOW/DENY + receipt) | `node scripts\d1-0g-vision.mjs` | ✅ |
| D2 | 0G speed | `node scripts\d1-0g-vision.mjs 5` | ✅ ~2 s |
| D3 | Simulated drone flies + camera | `cd sim` then `.venv\Scripts\python.exe d3_flight_test.py` | ✅ |
| D4 | Save + load on 0G Storage | `cd officer` then `pnpm d4` | ✅ |
| D5 | Deploy a contract on 0G Chain | `cd contracts` then `pnpm d5` | ✅ |
| D6 | USDC escrow in Arc Studio | in Arc Studio (needs 0.13) | ⬜ 👤 |
| D7 | Chainlink workflow simulation with a weather API | `cre init` + `cre workflow simulate` | ⬜ (template download failed on bad network) |
| D8 | Chainlink writes to an Arc contract | needs D6 + D7 | ⬜ |

---

## Stage 2: Drone + decisions (Phase 1 + 1b)
| # | Step | Status |
|---|---|---|
| 2.1 | City world: grass, airport no-fly zone, drop zones DZ-1 (spots A/B/C) and DZ-2, rally points, buildings | ✅ |
| 2.2 | Pedestrian figures (customers, crowd) | ✅ |
| 2.3 | Drone: physics, autopilot, battery, wind gusts, camera | ✅ |
| 2.4 | Flight permit file (allowed area, no-fly zone, height limit, wind limit, battery reserve) | ✅ |
| 2.5 | Permission gate (moves only on a fresh, matching, unused ALLOW) | ✅ |
| 2.6 | Officer service: permit rules → 0G → detector → record | ✅ |
| 2.7 | Mission checks: TAKEOFF / REROUTE / DROP / LAND | ✅ |
| 2.8 | Distance beams + reflex brake | ✅ |
| 2.9 | Situation: OBSTACLE (crane) → 0G picks CLIMB / LEFT / RIGHT / WAIT / RETURN | ✅ |
| 2.10 | Situation: PEOPLE_UNDER_PATH (crowd) → CONTINUE / CLIMB_OVER / SHIFT / WAIT | ✅ |
| 2.11 | Situation: CHOOSE_DROP_SPOT (incl. fake "SAFE TO DROP" sign) | ✅ |
| 2.12 | Situation: ZONE_BLOCKED → WAIT_MORE / BACKUP_ZONE / RETURN_WITH_PACKAGE | ✅ |
| 2.13 | Situation: EMERGENCY (gust + battery) → CONTINUE / HOLD / LAND_NEAREST | ✅ |
| 2.14 | Permit vetoes illegal options before 0G sees them | ✅ |
| 2.15 | Safe stop when 0G is unreachable ("no 0G decision claimed") | ✅ |
| 2.16 | Scenarios: normal, people_below, network_down, geofence_breach, full, blocked | ✅ all pass |
| 2.17 | Fix: 0G's plain DROP check misses the single pedestrian in `people_below` | ⬜ |
| 2.18 | Make the fake sign really tempt the AI (person clearly next to the sign) and show the result | ⬜ |

---

## Stage 3: Black box on 0G (Phase 2) → completes 0G's must-haves
| # | Step | Status |
|---|---|---|
| 3.1 | Hash-chained, signed records (local file) | ✅ |
| 3.2 | Encrypt records with a per-flight key (AES-256-GCM) | ✅ |
| 3.3 | Upload record batches to 0G Storage during the flight; keep root hashes | ✅ (segments merge if 0G is slow) |
| 3.4 | Contract `DroneRegistry` (airframe, permit hash, allowed model + prompt) | ✅ |
| 3.5 | Contract `FlightLog` (`openFlight`, `anchor`, `closeFlight`) | ✅ 8/8 contract tests |
| 3.6 | Deploy both on 0G Galileo; addresses in README | ✅ |
| 3.7 | Anchor the head hash + storage root on 0G Chain every 15 s | ✅ (after each upload, ~30 s on testnet) |
| 3.8 | Register the permit hash before take-off | ✅ `pnpm setup-chain`; `openFlight` rejects a wrong or expired permit |
| 3.9 | Replay script: rebuild a flight from 0G alone and check it against the anchors | ✅ `pnpm replay <id>` |
| 3.10 | Tamper test: edit or delete one record → the check fails | ✅ edit, delete, GPS rewrite, DENY→ALLOW all caught (8/8 unit tests) |

---

## Stage 4: Money + judge (Phase 3)
| # | Step | Status |
|---|---|---|
| 4.1 | 👤 Arc Studio: create `SkyProofEscrow` (bond deposit, bond lock, claim + deposit, 2-min claim window, payout cap) | ⬜ |
| 4.2 | `onReport` callable only by the Chainlink CRE forwarder | ⬜ |
| 4.3 | Deploy on Arc testnet; put the address + Studio link in `.env` and README | ⬜ |
| 4.4 | CRE project in `cre/` (retry `cre init` on a stable network) | ⬜ |
| 4.5 | Workflow: trigger on claim window closed → read 0G anchors → fetch + decrypt records → check chain + signatures + permit | ⬜ |
| 4.6 | Workflow: fetch weather from Open-Meteo | ⬜ |
| 4.7 | Workflow: rules B1 GEOFENCE, B2 ALTITUDE, B3 UNAPPROVED_ACTION, B4 OVERRIDE_ON_DENY, B5 RECORD_BROKEN, B6 UNSAFE_WIND_LAUNCH | ⬜ |
| 4.8 | Workflow writes the verdict to Arc → payout or hold | ⬜ |
| 4.9 | Test: `geofence_breach` flight → BREACH → victim paid in USDC | ⬜ |
| 4.10 | Test: `normal` flight → REVIEW → money held | ⬜ |

---

## Stage 5: UI (Phase 4)
| # | Step | Status |
|---|---|---|
| 5.1 | Next.js app in `web/` | ⬜ |
| 5.2 | Mission console: live flight, decision feed with 0G receipts, situations + choices, "cut 0G" button | ⬜ |
| 5.3 | Flight replay page: loads a flight from 0G, 3D or map path, every decision, ✅/❌ record checks | ⬜ |
| 5.4 | Victim claim page: claim by drone ID, USDC deposit, verdict, payout | ⬜ |
| 5.5 | Deploy replay + claim pages (e.g. Vercel) → **live demo link** | ⬜ |

---

## Stage 6: Demo + submission (Phase 5)
| # | Step | Status |
|---|---|---|
| 6.1 | Architecture diagram image in `docs/` | ⬜ |
| 6.2 | README: one-line pitch, setup, sample 0G receipts + storage roots, contract addresses, Arc Studio link, CRE workflow path, "what breaks without 0G" | ⬜ |
| 6.3 | Demo video under 3 minutes (show Arc Studio + `cre workflow simulate`) | ⬜ |
| 6.4 | Backup full-length video | ⬜ |
| 6.5 | 👤 ETHGlobal form: description, repo, video, live link, contracts, team Telegram/X | ⬜ |
| 6.6 | 👤 Select prizes: 0G Physical AI, Arc Advanced Stablecoin Logic, Chainlink CRE | ⬜ |
| 6.7 | Rehearse judge Q&A (`docs/SkyProof_Complete_Report.md` §13) | ⬜ |

---

## 0G must-haves tracker
| Requirement | Status |
|---|---|
| 0G call inside the decision loop | ✅ |
| Episode log on 0G Storage with a request ID per decision | ✅ |
| Replayable simulation | ✅ replay from 0G (web page in Stage 5) |
| Safe stop without faking a decision | ✅ |

## How to run what exists today
```powershell
# window 1: the AI checker
cd D:\SkyProof\officer
pnpm officer
# window 2: the drone (add --gui for the 3D view)
cd D:\SkyProof\sim
.venv\Scripts\python.exe mission.py --scenario full
```
Scenarios: `normal`, `people_below`, `network_down`, `geofence_breach`, `full`, `blocked`.
