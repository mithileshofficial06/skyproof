# AGENTS.md: instructions for AI coding agents working on SkyProof

This file follows the AGENTS.md convention (read by Codex, Cursor, Copilot agents and similar). Claude Code reads [CLAUDE.md](CLAUDE.md), which has the same rules.

## Project in one paragraph
SkyProof is a black box for autonomous drones; the demo uses a delivery drone. A PyBullet drone (`sim/`) asks the officer service (`officer/`) before every safety action; the officer asks a vision model on **0G Private Computer** and records a signed, hash-chained log that is encrypted to **0G Storage** every 15 s and fingerprinted on **0G Chain** (`contracts/contracts/FlightLog.sol`). Victims file claims on an **Arc** USDC escrow built in Arc Studio (`contracts/arc/SkyProofEscrow.sol`). A **Chainlink CRE** workflow (`cre/judge/verdict/`) verifies the record against 0G and decides; the escrow pays or holds for an insurer. The website (`web/`) is the front end for victims, insurers and operators.

## Setup and checks
- Full setup: [docs/Setup.md](docs/Setup.md). Architecture: [docs/Architecture.md](docs/Architecture.md). Specs: [docs/TRD.md](docs/TRD.md).
- Must pass before any PR:
  - `cd web && pnpm test && npx tsc --noEmit && npx eslint src && pnpm build`
  - `cd officer && pnpm test && npx tsc --noEmit -p .`
  - `cd cre/judge/verdict && bun test`
  - `cd contracts && pnpm test`

## Rules (non-negotiable)
1. **Secrets:** never read out, log, paste or commit `.env`, `cre/judge/.env` or anything in `officer/.tmp/`. Use `.env.example` files for new variables, with empty values.
2. **0G integrity:** the drone must never act on a made-up or stale decision. Keep the gate rules (fresh ≤ 10 s, request-bound, single-use) and the safe stop. Never mark a decision as coming from 0G unless it did.
3. **Judge independence:** the CRE workflow must verify data (hash chain, signatures, 0G Chain anchors) and treat missing/withheld records as breach B5. Keep `rules.ts` pure and tested; add a test for every rule change.
4. **Escrow:** only the CRE forwarder may deliver verdicts; the insurer may act only on held claims.
5. **Remote control surface:** website-started flights use a fixed scenario allowlist and `spawn` with an argument array. Never pass user input to a shell.
6. **Honesty in docs and UI:** don't claim per-response TEE signature verification (only provider attestation + sealed channel are recorded), DON deployment or real hardware. Keep the known-limitations lists accurate.
7. **UI text:** plain language for victims and insurers; no emojis; technical details behind a closed "Technical details" section.

## Conventions
- TypeScript strict; tabs in `cre/`, 2 spaces elsewhere (follow the file).
- Comments explain *why*, briefly.
- Commit messages: imperative summary + bullet body; AI-assisted commits carry a `Co-Authored-By` trailer.
- Third-party assets → `CREDITS.md`; AI-assisted work → `AI_USAGE.md`.
