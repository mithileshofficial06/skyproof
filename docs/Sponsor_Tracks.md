# SkyProof: Sponsor tracks, requirements and compliance

Source: ETHGlobal Mumbai prizes page (https://ethglobal.com/events/mumbai/prizes), checked 7 Nov 2026, plus the requirement text supplied by the team.
For each track: what the sponsor asks, what must be submitted, the judging constraints (including what disqualifies), and **where SkyProof meets each point, with evidence**.

**We are submitting for exactly these three bounties:**
1. **0G: Physical AI: Agents with a Body** ($5,000: 1st $2,500 · 2nd $1,500 · best real hardware $1,000)
2. **Arc: Best Smart Contracts with Advanced Stablecoin Logic, in Arc Studio** ($3,000)
3. **Chainlink: Best workflow with CRE** ($1,500)

---

## 1. 0G: Physical AI: Agents with a Body

**What 0G asks:** a robot, drone, wearable or device whose **decisions run on 0G**. Simulated builds are eligible for every prize. 0G makes the key decisions and keeps the record; motion stays on the device.
**Not wanted / disqualifying:** chatbots with robot avatars, pre-recorded motion, **0G used only for logs**, and **a fallback that fakes the decision (disqualifies)**.

### Must show

| # | Requirement | How SkyProof meets it | Evidence |
|---|---|---|---|
| 0G-1 | **A 0G call inside the decision loop** (vision, voice or decision model) | Every TAKEOFF / DROP / LAND / REROUTE and every in-flight situation is decided by `0gm-1.0-35b-a3b` (vision) on 0G Private Computer, served by a **TEE-attested provider (Intel TDX, dstack) over a sealed channel**, recorded per decision. The gate refuses to act without a fresh (≤ 10 s), request-bound, single-use answer. | `officer/src/zg.ts`, `officer/src/server.ts` (`decide`, `choose`), `sim/skyproof_sim/gate.py`; Live page; pc.0g.ai → Activity (key "Skyproof") |
| 0G-2 | **An episode log on 0G Storage with a request id per decision** | Each `DECISION` record stores `zg.requestId`, provider, model, latency, prompt hash, frame hash. The whole episode is uploaded to 0G Storage in AES-256-GCM segments every 15 s, each anchored on 0G Chain. | `officer/src/sealer.ts`; replay page "Rebuilt from 0G Storage" + "0G req" per decision; [proofs](../proofs/README.md) #06–#09; `pnpm replay <id>` rebuilds from 0G only |
| 0G-3 | **A replayable simulation** (or live hardware) | PyBullet simulation with 6 scenarios; every sealed flight replays in 3D on the website, rebuilt from 0G; judges can start a new one from the hosted Live page. | https://sky-proof.vercel.app/flights · `/live` → Start flight |
| 0G-4 | **A safe-stop fallback if 0G is unreachable; never fake the decision** | No answer in 9 s → HOLD → DIVERT → LAND, recorded as `SAFE_STOP_LOCAL` "pre-approved local policy, no 0G decision claimed". The officer records `NO_DECISION ZG_UNREACHABLE` (source `NONE`). The judge treats an action without a 0G approval as breach B3. | scenario `network_down`; proof #14 (`SKY-001-network_down-1793918402552`); Live → "Cut 0G link" |

**"What breaks if 0G is removed?"** The drone cannot take off, drop, land or resolve a situation, and nobody could prove what was decided or that the record was not edited afterwards.

### Must submit
| Item | Status |
|---|---|
| Project name + short description | ✅ README header |
| Public GitHub repo with README + setup instructions | ✅ https://github.com/mithileshofficial06/skyproof · [Setup.md](Setup.md) |
| **Demo video (< 3 min)** | ⏳ **to record** (script below) |
| Live demo link | ✅ https://sky-proof.vercel.app |
| Contract deployment addresses | ✅ [Deployments.md](Deployments.md) |

---

## 2. Arc: Best Smart Contracts with Advanced Stablecoin Logic, in Arc Studio

**What Arc asks:** write, test and deploy Arc Studio smart contracts with **programmable USDC/EURC logic**, connected to a web or mobile app. Examples: **conditional escrow**, payroll/vesting, treasury splitting, software-to-software payments. Bonus for reusable contracts.

### Qualification requirements (all Arc bounties)
"Submissions will be evaluated based on the following parameters. Please be clear what bounty you are submitting for."

| # | Requirement | How SkyProof meets it | Evidence | Status |
|---|---|---|---|---|
| ARC-1 | **Built in Arc Studio**, shareable project URL judges can open, **Studio shown in the demo** | `SkyProofEscrow` built and deployed from Arc Studio | https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm (opens) | ✅ URL · ⏳ show in video |
| ARC-2 | **Functional MVP + architecture diagram** (working frontend and backend) | Website (Report / Track / Insurer) + officer, evidence server, CRE runner; diagrams | https://sky-proof.vercel.app · [Architecture.md](Architecture.md) · README mermaid | ✅ |
| ARC-3 | **Video + presentation**: core functions, effective use of Arc Studio and Circle developer tools, detailed documentation | Docs: README, PRD, TRD, Architecture, this file | ⏳ video; docs ✅ |
| ARC-4 | **Link to GitHub/Replit repo** | public GitHub | ✅ |

### The stablecoin logic (what to point judges at)
| Logic | Where |
|---|---|
| Operator bond in USDC per airframe; drone **active only while bond ≥ cap** | `depositBond`, `isActive` |
| Bond **withdrawal cooldown** after the last claim (can't run away from claims) | `withdrawBond` |
| **Refundable 1 USDC claim deposit** (anti-spam) | `openClaim` |
| **Incident window** (120 s) grouping several victims | `openClaim`, `closeClaimWindow` |
| **Oracle-conditional payout**: only the Chainlink CRE forwarder can deliver a verdict; BREACH pays the cap + refunds the deposit atomically | `onReport` |
| **Human-in-the-loop** for unclear cases, insurer can't undo automatic payouts | `resolveHeld` |
| **Timeouts** protect the victim: 7 days without verdict, 30 days without decision → deposit back | `expireClaim`, `expireHeld` |
| **Pull-payment fallback** if a push transfer fails | `withdrawCredit` |

Proven on Arc: claims #1 and #10 BREACH → paid, #2/#8/#9 REVIEW → held ([Deployments.md](Deployments.md#key-transactions)).

### Known gaps for this track
- **No unit tests for `SkyProofEscrow` in the repo** (the track says "write, test and deploy"). Behaviour is exercised on testnet only.
- **Circle developer tools beyond USDC** (Wallets, CCTP/Bridge Kit, Gateway) are not used.
- Studio must be **shown in the demo video**.

---

## 3. Chainlink: Best workflow with CRE

**What Chainlink asks:** build, simulate or deploy a **CRE workflow used as an orchestration layer** in the project. Deployment is optional; **simulation is enough**.

| # | Requirement | How SkyProof meets it | Evidence | Status |
|---|---|---|---|---|
| CL-1 | Build / simulate / deploy a CRE workflow used as an **orchestration layer** | The `verdict` workflow orchestrates the whole claim decision: Arc trigger → 0G Chain reads → record from the evidence host / 0G Storage → Open-Meteo → verdict write on Arc | `cre/judge/verdict/workflow.ts`, `rules.ts` | ✅ |
| CL-2 | Integrate **at least one blockchain with an external API / system / data source** | **2 blockchains** (Arc: EVM log trigger + write; 0G Galileo: EVM reads) + **2 external sources** (Open-Meteo weather API; operator evidence host serving 0G Storage data) | workflow logs ("0G Chain: flight…", "weather (Open-Meteo)…") | ✅ |
| CL-3 | Demonstrate a **successful simulation via the CRE CLI** (or live deployment) | `cre workflow simulate verdict … --broadcast`; verdicts written on Arc through the forwarder; auto-runner runs it for every closed claim | proofs `chainlink-cre/` 02–07; claims #1, #2, #8, #9, #10 | ✅ |
| CL-4 | **Meaningfully used** in the project | It is the judge: it decides whether USDC moves from the operator to the victim | escrow `onReport` | ✅ |

Extra quality points: verifies data instead of trusting it (hash chain, signatures, 0G Chain anchors), consensus over the compact result, independent weather, withheld record = breach, 9 rule tests on all real flights, a security audit with a fix log ([CRE_Security_Audit_2026-11-06.md](CRE_Security_Audit_2026-11-06.md)).
Known limits: simulation only (no DON deploy access); workflow-ID pinning on the escrow is off.

---

## 4. Submission checklist (ETHGlobal form)

| Item | Value | Done |
|---|---|---|
| Project name | SkyProof | ✅ |
| Short description | "An independent, tamper-proof black box for autonomous drones (demo: a delivery drone): 0G decides and records every move, Chainlink CRE judges claims, and an Arc Studio USDC escrow pays victims automatically." | ✅ |
| Bounties selected | 0G Physical AI · Arc Advanced Stablecoin Logic · Chainlink CRE | ☐ select in the form |
| GitHub | https://github.com/mithileshofficial06/skyproof (`main`) | ✅ |
| Live demo | https://sky-proof.vercel.app | ✅ |
| Demo video < 3 min | — | ☐ |
| Arc Studio URL | https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm | ✅ |
| Contract addresses | [Deployments.md](Deployments.md) | ✅ |
| Architecture diagram | [Architecture.md](Architecture.md) | ✅ |
| Notes for judges | "Live → Start flight works while the team laptop is online. Claims need MetaMask on Arc Testnet + faucet USDC (guide on the Report page)." | ☐ paste |

## 5. Demo video script (under 3 minutes)

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Home | "After a drone accident, the only log belongs to the operator. In 2019 investigators couldn't even find it." |
| 0:20–1:05 | Live → Start "Person in the drop zone" | "Every move is decided by a vision model on **0G Private Computer**. A person walks in: 0G says DENY. Each decision has a 0G request id." Cut the 0G link: "No answer means a safe stop, never a fake approval." |
| 1:05–1:25 | Replay: "Rebuilt from 0G Storage", "Every anchor matches"; storagescan + chainscan | "The record is encrypted on **0G Storage** every 15 seconds and fingerprinted on **0G Chain**." |
| 1:25–1:50 | **Arc Studio** project page, then the escrow on arcscan | "The escrow is built in **Arc Studio**: USDC bond, deposit, claim window, payouts only from Chainlink." |
| 1:50–2:30 | Report a problem on the cheating flight → Track shows Approved → Paid | "**Chainlink CRE** finds the flight on 0G Chain, checks the record, the weather, six rules, and writes the verdict. The victim is paid in USDC automatically." |
| 2:30–2:50 | Insurer inbox | "Unclear cases go to a human, who must give a reason the victim can read." |
| 2:50–3:00 | Title card | "0G decides, Chainlink judges, Arc pays." |
