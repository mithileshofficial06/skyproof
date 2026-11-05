# SkyProof

An independent, tamper-evident black box for the automated decisions autonomous drones already make.
0G decides and records, Chainlink judges, Arc pays.

ETHGlobal Mumbai, Nov 5–7 2026 · 0G Physical AI · Arc Advanced Stablecoin Logic (Arc Studio) · Chainlink CRE

## How it works
1. **0G (brain + black box):** before every drop, landing or reroute, a 0G vision model (Private Computer, verified runs) answers ALLOW / DENY with a request ID. The drone acts only on ALLOW. Each decision is hash-chained to 0G Storage and anchored on 0G Chain. If 0G is unreachable the drone runs a pre-approved safe landing, logged as "no 0G decision claimed".
2. **Chainlink CRE (judge):** after a claim, a workflow reads the record, checks hashes, signatures and objective rules (geofence, altitude, broken chain) plus weather, and posts a verdict.
3. **Arc (money):** the operator's USDC bond pays the victim automatically on a breach verdict; otherwise funds are held for the insurer.

## Layout
| Folder | What | Stack |
|---|---|---|
| `sim/` | PyBullet drone, city, scenarios | Python 3.12, gym-pybullet-drones |
| `officer/` | Gate, 0G calls, record chain, Storage upload | TypeScript (Node) |
| `contracts/` | DroneRegistry, FlightLog on 0G Galileo | Solidity, Foundry |
| `cre/` | Verdict workflow | TypeScript, Bun, CRE CLI |
| `web/` | Mission console, replay, claim page | Next.js |
| `scripts/` | Day-0 tests | |
| `docs/` | Build report, research | |

The Arc escrow contract is built in Arc Studio (prize requirement); its link goes in `.env`.

## Setup
1. `cp .env.example .env` and fill it in.
2. See `docs/` for the full spec and evidence.

## Live on 0G Galileo (chain 16602)
| Contract | Address |
|---|---|
| DroneRegistry (airframe, signed permit, allowed 0G model + prompts) | `0xC3e0C4a5848c6b8754820286AF9805F6c4ca1Adf` |
| FlightLog (flight fingerprints: head hash + 0G Storage root per segment) | `0x2E6F0f6f3121e3aA7984ffC292f80E75c937cBa5` |

### Sample sealed flight (`full` scenario, 6 Nov 2026)
- 0G Chain flight id `0x736eef3399c796570604a77738bcce379ebae4bf878dd0db5920b4e6953ab55e`, 2 anchors, closed
- 0G Storage roots: `0xad41eceae34f…` (records 0-24, uploaded mid-flight), `0xb113b74afb2a…` (records 25-48)
- 16 decisions by 0G Private Computer, e.g. request ids `f855eed6-f8ee-4d5b-9a3d-080880e10b9e` (PEOPLE_UNDER_PATH → SHIFT_LEFT), `435ead46-a697-473d-9157-def5270826eb` (OBSTACLE → CLIMB), `076974b4-ba4e-40f0-87bf-3c7ad76769dd` (EMERGENCY → LAND_NEAREST)

**What breaks without 0G:** the drone cannot take off, drop, land or resolve an in-flight situation, and nobody can prove which model decided what or that the record was not edited afterwards.

## Run it
```powershell
# one time
cd contracts; pnpm install; pnpm deploy          # already deployed: see contracts/deployments/galileo.json
cd ..\officer; pnpm install; pnpm setup-chain     # register airframe, permit, model + prompts

# each flight (two windows)
cd officer; pnpm officer
cd sim; .venv\Scripts\python.exe mission.py --scenario full [--gui]

# rebuild any flight from 0G alone and check it
cd officer; pnpm replay <flight-id> [--tamper | --delete]
```
Scenarios: `normal`, `people_below`, `network_down`, `geofence_breach`, `full`, `blocked`.

## Arc + Chainlink (Stage 4)
| Piece | Where |
|---|---|
| SkyProofEscrow (built in Arc Studio), Arc Testnet | `0x10daa2dbded35f0056be1dbdbee908a12e4644d8` · [Arc Studio project](https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm) · source in `contracts/arc/` |
| Chainlink CRE judge | `cre/judge/verdict/workflow.ts` (trigger: `ClaimWindowClosed` on Arc) |

The judge finds the flight on 0G Chain, checks the released record against the 0G Chain anchors (it does not trust the evidence host), cross-checks Open-Meteo weather, applies rules B1-B6 and writes the verdict to the escrow. Only the CRE forwarder can call `onReport`.

**Proven on testnet (6 Nov 2026):** cheating flight → claim #1 → BREACH → victim paid 5 USDC + deposit (verdict tx `0xc996a439b0b1e7d0ebc7667992f3747863411c274218651d5932564eae675789`); honest flight → claim #2 → REVIEW → funds held (tx `0xff9b97e456202c12b31f46f3fad6d093c677acab31bdb6bd4935626012a66cee`).

```powershell
cd officer; pnpm arc-setup                 # register drone, bind operator, lock bond (once)
cd officer; pnpm evidence                  # operator's evidence endpoint (keep running)
cd officer; pnpm claim <flight-id>         # victim files + closes a claim (prints the CRE command)
cd cre\judge; cre workflow simulate verdict --non-interactive --trigger-index 0 --evm-tx-hash <closeTx> --evm-event-index 0 --broadcast -T staging-settings
```
`cre/judge/.env` holds `CRE_ETH_PRIVATE_KEY` (git-ignored). On Windows put the real `bun.exe` on PATH for the WASM build.
