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
