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
| `sim/` | PyBullet drone, city, scenarios | Python 3.10, gym-pybullet-drones |
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
