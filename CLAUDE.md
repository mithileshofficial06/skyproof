# SkyProof: guide for Claude Code

SkyProof is a tamper-proof black box for autonomous drones (the demo uses a delivery drone): **0G decides and records, Chainlink CRE judges claims, an Arc Studio USDC escrow pays victims.** ETHGlobal Mumbai 2026. Tracks: 0G Physical AI, Arc Advanced Stablecoin Logic, Chainlink CRE.

Read first: [README.md](README.md) · [docs/TRD.md](docs/TRD.md) · [docs/Architecture.md](docs/Architecture.md) · [docs/Sponsor_Tracks.md](docs/Sponsor_Tracks.md).

## Repo map
| Path | What |
|---|---|
| `sim/` | PyBullet drone + safety gate (Python 3.12, `.venv`) |
| `officer/src/server.ts` | flight computer: permit rules, 0G calls, record chain, sealing, website Start |
| `officer/src/evidence.ts` | evidence server :8788 |
| `officer/src/cre-runner.ts` | auto-runs the CRE judge on `ClaimWindowClosed` |
| `cre/judge/verdict/` | CRE workflow (`workflow.ts`) + pure rules (`rules.ts`, tested) |
| `contracts/contracts/` | DroneRegistry, FlightLog (0G Galileo); `contracts/arc/SkyProofEscrow.sol` (Arc Studio) |
| `web/` | Next.js site (Vercel, root dir `web`) |
| `docs/`, `proofs/`, `reports/flights/` | documentation, on-chain proof pack, flight summaries |

## Commands
| Task | Command |
|---|---|
| Services | `cd officer; pnpm officer` · `pnpm evidence` · `pnpm cre-runner` · `cd web; pnpm build; pnpm start` |
| Fly | website Live → Start flight, or `cd sim; .venv\Scripts\python.exe mission.py --scenario <s> [--gui]` |
| Tests | `web: pnpm test` (28) · `officer: pnpm test` (8) · `cre/judge/verdict: bun test` (9) · `contracts: pnpm test` (8) |
| Type/lint | `cd web; npx tsc --noEmit; npx eslint src` · `cd officer; npx tsc --noEmit -p .` |
| 0G replay | `cd officer; pnpm replay <flight-id> [--tamper|--delete]` |
| Claim (script) | `cd officer; pnpm claim <flight-id>` |

## Hard rules
- **Never print, paste or commit secrets.** `.env`, `cre/judge/.env`, `officer/.tmp/` (incl. `keys/`, `drone.token`) are git-ignored. Before every commit, scan staged files against the real key values.
- **Never fake a 0G decision.** No answer → safe stop recorded as "no 0G decision claimed". This is a 0G disqualification rule.
- **The judge must not trust the operator.** Records are verified against 0G Chain anchors; a withheld or unreadable record is breach B5.
- **Remote starts:** fixed scenario list only, argument-array `spawn` (never a shell string), one flight at a time, daily cap, drone token.
- 0G decisions use `0gm-1.0-35b-a3b`, a TEE-attested provider (TDX, dstack) over a sealed channel; the permit names the model and the officer refuses any other. Don't claim we verify each response's enclave signature ourselves (we don't yet).
- Don't work around blocked installers (e.g. Foundry `curl | bash`).
- Commit/push only when asked; branch `feat/ui-3d`, then `main` = same commit. End commit messages with the Co-Authored-By trailer.
- After any website change: `pnpm build` (Vercel serves the production build; dev mode is slow).

## Writing style for user-facing text
Victim and insurer pages use plain words (record, proof, automatic check, payout). No hashes, "CRE", "bond" or "anchor" outside "Technical details". No emojis anywhere on the site. Status = colour + icon + word.

## UI / 3D rules
- On `/experience`, the canvas is fixed and full-viewport; DOM sections scroll over it. The 3D and DOM communicate only through the zustand store.
- Budget: 60fps mid laptop, dpr [1,1.75], GLB < 2MB. Never allocate objects inside useFrame.
- Data only via web/src/lib/data/adapter.ts (published flights via `web/src/lib/siteData.ts`). Never present simulated data as live; keep the mode badge truthful.
- Verify every visual change with Playwright screenshots (1440 + 390) before calling it done.
- Use Context7 for library APIs; do not guess props.
- Log AI-assisted UI files in AI_USAGE.md; list third-party assets (incl. sponsor logos) in CREDITS.md.
- specs/05a-uiux-decisions.md records how specs/05-uiux.md is adapted to this repo; it wins over 05 where they differ.
