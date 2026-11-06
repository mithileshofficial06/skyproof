# SkyProof: Implementation plan and status

Status as of 7 Nov 2026. ✅ done · ⏳ in progress / to do · ➖ deliberately out of scope.

## Phase 0: Foundations (5 Nov)
| Step | Deliverable | Status |
|---|---|---|
| 0.1 | Day-0 checks: 0G vision call, 0G Storage upload/download, 0G Chain deploy (`scripts/`, `officer/src/tests/d4-storage.ts`) | ✅ |
| 0.2 | Repo layout: `sim/`, `officer/`, `contracts/`, `cre/`, `web/` | ✅ |

## Phase 1: Drone + 0G decisions
| Step | Deliverable | Status |
|---|---|---|
| 1.1 | PyBullet city, drone, sensors, camera frames (`sim/skyproof_sim/`) | ✅ |
| 1.2 | Safety gate: fresh, matching, single-use approvals; safe stop (`gate.py`) | ✅ |
| 1.3 | Officer: permit hard rules, 0G vision decisions, situations with vetoes, detector-stricter-only | ✅ |
| 1.4 | 6 scenarios incl. `network_down` and `geofence_breach` | ✅ |

## Phase 2: Black box on 0G
| Step | Deliverable | Status |
|---|---|---|
| 2.1 | Signed, hash-chained records (`record.ts`) | ✅ |
| 2.2 | `DroneRegistry`, `FlightLog` on 0G Galileo + tests (8) | ✅ |
| 2.3 | Encrypted segments to 0G Storage every 15 s + anchors (`sealer.ts`) | ✅ |
| 2.4 | `pnpm replay` rebuilds from 0G only; tamper/delete detection | ✅ |

## Phase 3: Claims and payouts (Arc + Chainlink)
| Step | Deliverable | Status |
|---|---|---|
| 3.1 | `SkyProofEscrow` in Arc Studio: bond, cap, deposit, window, forwarder-only verdicts, insurer, timeouts | ✅ |
| 3.2 | CRE judge workflow: lookup, record verification vs 0G anchors, rules B1–B6, Open-Meteo, report to Arc | ✅ |
| 3.3 | Evidence server: records, victim evidence and insurer reasons on 0G Storage | ✅ |
| 3.4 | CRE security audit + fixes (approval matching, unclosed flights, withheld records, take-off-hour wind) + rule tests (9) | ✅ |
| 3.5 | Auto-runner: watches Arc, warms evidence, runs the judge, closes ended windows | ✅ |
| 3.6 | Fast evidence lookup (cache + time window), warm-up before judging (fixed a false-B5 timeout) | ✅ |

## Phase 4: Website
| Step | Deliverable | Status |
|---|---|---|
| 4.1 | Live console, flight replays (3D), plain-English summaries, browser verification | ✅ |
| 4.2 | `/experience` 3D story (UI-0..10) | ✅ |
| 4.3 | Role-based simple UI: Report, Track, Insurer inbox, Operator hub; no emojis; official sponsor logos on 3D flags; live blurred background | ✅ |
| 4.4 | Start flight from the website (fixed scenarios, one at a time, daily cap, optional passcode, drone token) | ✅ |

## Phase 5: Hosting and verification
| Step | Deliverable | Status |
|---|---|---|
| 5.1 | Vercel (`web/`) + VS Code public tunnels for 8787 / 8788 | ✅ https://sky-proof.vercel.app |
| 5.2 | Hosted end-to-end test (26 checks) incl. live flight and automatic BREACH payout (claim #10) | ✅ [report](E2E_Test_Report_2026-11-07.md) |
| 5.3 | Documentation set: README, PRD, TRD, Architecture, Sponsor tracks, Sponsors, Setup, Deployments, CLAUDE.md, AGENTS.md | ✅ |

## Phase 6: Before submission (to do)
| Step | Deliverable | Owner | Status |
|---|---|---|---|
| 6.1 | **Demo video < 3 min** (script in [Sponsor_Tracks.md](Sponsor_Tracks.md#5-demo-video-script-under-3-minutes)); must show Arc Studio | team | ⏳ |
| 6.2 | Top up the operator bond (10 USDC left = 2 payouts) | team | ⏳ |
| 6.3 | Hardhat tests for `SkyProofEscrow` (Arc "write, test, deploy") | dev | ⏳ |
| 6.4 | Fill the ETHGlobal form (checklist in Sponsor_Tracks.md §4) | team | ⏳ |

## Next (after the hackathon)
| Item | Why |
|---|---|
| Verify each response's enclave signature (0G serving-broker `processResponse()`) and have the judge check it per decision | per-response TEE proof (provider attestation + sealed channel already done) |
| Deploy the CRE workflow to a DON; set `expectedWorkflowId/Owner` on the escrow | production judge |
| Encrypt each flight key to the insurer/judge as well | operator can't withhold |
| Location + time match between complaint and record in the judge | stop claims against a breach flight from elsewhere |
| Real hardware (e.g. a small quadcopter) | 0G hardware prize |
| ➖ Fiat payouts, KYC, insurance licensing | out of scope |
