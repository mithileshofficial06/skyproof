# SkyProof: end-to-end test of the hosted site + sponsor requirement check

**Date:** 6–7 Nov 2026 (IST) · **Site:** https://sky-proof.vercel.app · **Commit tested:** `6c609b0` (Vercel), local services on the operator laptop via VS Code public tunnels
**Method:** a real Chrome browser (Playwright) driving the hosted site, plus on-chain checks on 0G Galileo and Arc Testnet. Nothing was mocked.

## 1. Results

### Website (hosted)
| # | Check | Result |
|---|---|---|
| 1 | Home: "What do you need?" role cards | PASS |
| 2–5 | Nav → Report a problem, Track my claim, For insurers, For operators | PASS |
| 6 | All pages 200 (`/`, `/claim`, `/track`, `/insurer`, `/operator`, `/live`, `/flights`, `/experience`), logos served | PASS |
| 7 | Tunnel addresses compiled into the build (`NEXT_PUBLIC_OFFICER_WS`, `NEXT_PUBLIC_EVIDENCE_URL`) | PASS |
| 8 | Page errors across the run | none |

### 0G flow (started from the hosted Live page)
| # | Check | Result |
|---|---|---|
| 9 | Live: "Officer connected" through the public tunnel | PASS |
| 10 | "Start flight" (Person in the drop zone) accepted from the hosted site | PASS |
| 11 | 0G TAKEOFF → ALLOW shown live (5 s after start) | PASS |
| 12 | 0G DROP → DENY (person in the zone), drone waits | PASS |
| 13 | Flight closed; sealed in 3 segments on 0G Storage; `openFlight` + 2 anchors + `closeFlight` on 0G Chain | PASS (`SKY-001-people_below-1793994439408`, open tx `0xd3d917e2…`) |
| 14 | New flight appears in Past flights on the hosted site (served from the laptop through the tunnel) | PASS |
| 15 | Replay: "Rebuilt from 0G Storage", "Every anchor matches", 0G request ids, plain-English summary | PASS |
| 16 | Home "Check it yourself": record verified as genuine against 0G Chain in the browser | PASS |

### Chainlink + Arc flow
| # | Check | Result |
|---|---|---|
| 17 | Fresh "cheating operator" flight started through the public tunnel; every action logged WITHOUT 0G approval | PASS (`SKY-001-geofence_breach-1793994709528`) |
| 18 | Claim #10 filed on Arc (1 USDC deposit), window closed | PASS |
| 19 | CRE auto-runner picked up `ClaimWindowClosed`, warmed the evidence host (6.1 s), ran the workflow | PASS |
| 20 | Workflow: found the flight on 0G Chain, 17 records intact from 0G Storage, Open-Meteo wind 2.3 m/s, **BREACH** (B1 geofence, B3 unapproved actions) | PASS |
| 21 | Verdict written to Arc via the CRE forwarder; victim paid 5 USDC + deposit back (16.93 → 21.91 USDC); bond 15 → 10 | PASS (tx `0x0f081515…`) |
| 22 | Hosted Track #10: "Approved automatically … it acted without the AI's permission" → Paid | PASS |
| 23 | Hosted Track #5 Paid, #4 / #8 "With an insurer", unknown id → "could not find" | PASS |
| 24 | Hosted insurer inbox: held claims, "Record is genuine", map, side-by-side complaint vs record | PASS |
| 25 | Hosted claim page: judge guide with faucet link, flights selectable, Send disabled until a wallet is connected | PASS |
| 26 | Earlier today: honest flight → claims #8 / #9 → REVIEW automatically (incl. victim walking away: runner closed the window) | PASS |

### Not testable headless
- Filing a claim **with MetaMask in the browser** (needs a real wallet extension). The same contract calls were exercised by the claim script (#18), and the page wiring is unchanged from earlier manual runs.
- The insurer **Approve/Reject** buttons (need the insurer wallet in MetaMask). Covered earlier by a manual run.

### Bug found and fixed during the test
- `officer/src/claim.ts` printed the block-wide log index (e.g. 27) in its "run the judge by hand" hint; the CRE CLI expects the position inside the receipt (0). Fixed. The auto-runner already used the right value.

## 2. Sponsor requirements vs implementation

### 0G: Physical AI, Agents with a Body ($5,000)
| Requirement (ETHGlobal Mumbai prize page) | SkyProof | Status |
|---|---|---|
| 0G call inside the decision loop (vision / decision model) | qwen3.8-flash vision on 0G Private Computer decides TAKEOFF / DROP / LAND / REROUTE and in-flight situations; the gate refuses to act without a fresh, matching, single-use answer | Met |
| Episode log on 0G Storage with a request id per decision | Every DECISION record holds the 0G request id, provider, model, latency, prompt hash and frame hash; encrypted segments uploaded during the flight | Met |
| Replayable simulation or live hardware | PyBullet simulation; every flight replays in 3D, rebuilt from 0G Storage | Met |
| Safe stop if 0G is unreachable, never a faked decision | `network_down` scenario: HOLD → DIVERT → LAND, recorded "no 0G decision claimed" (proof #14) | Met |
| Not wanted: "0G used only for logs" | 0G makes the decisions; without it the drone cannot act | Clear |
| Submission: public repo + README, live demo link, contract addresses, demo video < 3 min | Repo + README + Vercel link + addresses done; **demo video: still to record** | Partly |

### Chainlink: Best workflow with CRE ($1,500)
| Requirement | SkyProof | Status |
|---|---|---|
| CRE workflow as an orchestration layer | The judge orchestrates Arc (trigger + write), 0G Chain (reads), 0G Storage via the evidence host, Open-Meteo | Met |
| At least one blockchain + an external API / data source | 2 chains (Arc, 0G Galileo) + 2 external sources (Open-Meteo, evidence host) | Met |
| Successful simulation via the CRE CLI (or deployment) | `cre workflow simulate --broadcast`; verdicts written on Arc (#1, #2, #8, #9, #10) | Met |
| Meaningfully used | It decides whether money moves | Met |

### Arc: Best Smart Contracts with Advanced Stablecoin Logic, in Arc Studio ($3,000)
| Requirement | SkyProof | Status |
|---|---|---|
| Built in Arc Studio, shareable project URL | `studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm` (opens, HTTP 200) | Met |
| Programmable USDC logic (e.g. conditional escrow) | Bond-gated activation, per-claim cap, refundable deposit, incident window, oracle-conditional payout, insurer review, 30-day expiry, bond cooldown | Met |
| Connected to a web app | Report / Track / Insurer pages call the escrow | Met |
| "Write, **test**, and deploy" | Deployed and exercised on testnet; **no unit tests for the escrow in the repo** | Partly |
| Functional MVP (frontend + backend), architecture diagram | Yes; diagram in the README (mermaid) | Met |
| Video + presentation showing Arc Studio and Circle developer tools | **Video still to record; show the Studio project in it.** Only USDC is used, no other Circle tools (Wallets, CCTP, Gateway) | Partly |
| Bonus: reusable contracts | Escrow is per-airframe and generic, not packaged as a reusable template | Partly |

## 3. Risks for judging day
- **Operator bond is 10 USDC: two automatic payouts left.** Each cheating-flight claim a judge files costs 5 USDC. The operator wallet holds 4.99 USDC, so move test USDC to it and top the bond up (`ARC_BOND_USDC=30 npx tsx src/arc-setup.ts`).
- Operator 0G gas: 0.435 0G, enough for many flights.
- The laptop, VS Code tunnel and the three officer services must stay up. If the Wi-Fi drops, flights do a safe stop and may not seal (seen once today).
- Judges need MetaMask + faucet USDC to file a claim themselves; the "How to test" box explains it.

## 4. Score

| Area | Score | Why |
|---|---|---|
| 0G integration (Physical AI rules) | **18 / 20** | All four qualification rules met and proven live from the hosted site. Not TEE-attested (router, "via aliyun"); the serving-broker proof is not checked. |
| Chainlink CRE | **18 / 20** | Real orchestration across 2 chains + 2 sources, independent weather, record verified against 0G anchors, fully automatic. Simulation-only (no DON), workflow pinning off, claims #6/#7 were wrongly paid before the fix. |
| Arc | **15 / 20** | Rich conditional USDC escrow built in Arc Studio and wired to the site. No escrow unit tests, no other Circle tools, Studio not yet shown in a video. |
| Problem and story | **13 / 15** | Real, documented gap (BEA 2019 Barcarès report); clear "0G decides, Chainlink judges, Arc pays". Simulated drone, not hardware. |
| UI/UX and demo | **13 / 15** | Simple role-based site, live start from the hosted page, plain-language claims. Relies on the laptop being online; MetaMask + faucet friction for judges. |
| Engineering and docs | **9 / 10** | 53 tests, detailed README, audit, proofs, honest limits. |
| **Total** | **86 / 100** | |

**Fastest ways up:** record the < 3-minute demo video (shows Arc Studio, a live 0G DENY, an automatic Chainlink payout); add Hardhat tests for `SkyProofEscrow`; top up the bond; optionally verify 0G responses with the serving-broker SDK.
