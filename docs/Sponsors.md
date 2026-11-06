# SkyProof: Sponsors and how each one is used

## 0G (Zero Gravity)
**What it is:** a decentralised AI platform: compute (AI models run by 0G providers), storage (a decentralised file network) and an EVM chain.

| 0G product | SkyProof's use | Why it is needed |
|---|---|---|
| **Private Computer** | the drone's brain: a vision model approves or denies every safety action, with a request id per call | the decision comes from outside the operator, with a receipt |
| **Storage** | the black box: encrypted record segments uploaded during the flight; victim evidence and insurer reasons too | the record sits outside the operator's control |
| **Chain (Galileo)** | the notary: `DroneRegistry` (permit, allowed model) and `FlightLog` (fingerprint + storage root every 15 s) | any later edit is detectable by anyone |

Files: `officer/src/zg.ts`, `sealer.ts`, `chain.ts`, `crypto.ts`, `contracts/contracts/*.sol`.

## Chainlink (CRE: Chainlink Runtime Environment)
**What it is:** a runtime for workflows that combine blockchains and outside data, run by decentralised nodes with consensus.

**SkyProof's use:** the neutral judge. Triggered by `ClaimWindowClosed` on Arc, it reads 0G Chain, fetches and verifies the record, checks the weather on Open-Meteo, applies rules B1–B6, and writes the verdict to the Arc escrow through the CRE forwarder.
**Why it is needed:** neither the operator nor the victim should decide the claim; a decentralised, verifiable judge does.
Files: `cre/judge/verdict/workflow.ts`, `rules.ts`, `officer/src/cre-runner.ts`.

## Arc (by Circle)
**What it is:** Circle's stablecoin-native Layer-1, where USDC is the native money (and pays gas); **Arc Studio** is its contract-building environment.

**SkyProof's use:** `SkyProofEscrow`, built in Arc Studio: the operator's USDC bond, victims' claims and deposits, automatic payouts on a Chainlink BREACH verdict, insurer review of held claims, and timeouts that protect victims.
**Why it is needed:** compensation happens in dollars, instantly, by rule, with no paperwork.
Files: `contracts/arc/SkyProofEscrow.sol`, `web/src/app/{claim,track,insurer}`, `officer/src/arc*.ts`.

## How they connect
```
drone asks 0G  →  0G decides  →  record sealed on 0G Storage + Chain
victim claims on Arc  →  Chainlink CRE judges using 0G data  →  Arc pays (or an insurer decides)
```
Requirement-by-requirement compliance: [Sponsor_Tracks.md](Sponsor_Tracks.md).
