# SkyProof: Setup instructions

Three ways to use SkyProof, from easiest to fullest.

## A. Just try it (judges)
Open **https://sky-proof.vercel.app**.
- **Watch 0G decide:** Live → pick a scenario → **Start flight** (works while the team's flight computer is online).
- **Verify a record:** Home → "Don't trust us".
- **File a claim:** Report a problem → "How to test this (for judges)": MetaMask + Arc Testnet + free USDC from https://faucet.circle.com.
- **Follow a claim:** Track my claim (try `10` paid, `4` held).

## B. Run everything locally

### 1. Prerequisites
| Tool | Version | Notes |
|---|---|---|
| Node.js | 22+ | |
| pnpm | 9+ | `npm i -g pnpm` |
| Python | 3.12 | PyBullet compiles from source on Windows: install **Microsoft C++ Build Tools** (Desktop C++ + Windows SDK) |
| Bun | latest | for the CRE workflow build (on Windows put the real `bun.exe` on PATH) |
| CRE CLI | v1.39+ | https://docs.chain.link/cre (`cre login`) |
| MetaMask | | for claims and the insurer desk |

### 2. Get the code
```powershell
git clone https://github.com/mithileshofficial06/skyproof
cd skyproof
```

### 3. Secrets (never committed)
```powershell
copy .env.example .env
copy cre\judge\.env.example cre\judge\.env
```
| Variable (`.env`) | What |
|---|---|
| `ZG_PC_API_KEY`, `ZG_PC_BASE_URL`, `ZG_VISION_MODEL` | 0G Private Computer key, router, model (`qwen3.8-flash`) |
| `ZG_RPC_URL`, `ZG_CHAIN_ID`, `ZG_STORAGE_INDEXER` | 0G Galileo RPC (16602) and storage indexer |
| `DEPLOYER_PRIVATE_KEY` | owner/insurer (0G admin + Arc owner) |
| `OPERATOR_PRIVATE_KEY` | signs records; needs 0G testnet gas and Arc USDC for the bond |
| `VICTIM_PRIVATE_KEY` | test victim for `pnpm claim` |
| `ARC_RPC_URL`, `ARC_CHAIN_ID`, `ARC_ESCROW_ADDRESS`, `ARC_STUDIO_PROJECT_URL` | Arc Testnet |
| `DEMO_MAX_FLIGHTS`, `DEMO_PASSCODE`, `DEMO_START` | website "Start flight" controls (optional) |
| `cre/judge/.env` → `CRE_ETH_PRIVATE_KEY` | key the CRE simulation broadcasts with (Arc USDC for gas) |

Funding: 0G testnet faucet for the operator; https://faucet.circle.com (Arc Testnet) for USDC.

### 4. Install
```powershell
cd officer; pnpm install; cd ..
cd web; pnpm install; cd ..
cd contracts; pnpm install; cd ..
cd sim
py -3.12 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
git clone --depth 1 https://github.com/learnsyslab/gym-pybullet-drones.git third_party/gym-pybullet-drones   # if missing
.venv\Scripts\pip install --no-deps -e third_party\gym-pybullet-drones
cd ..
```

### 5. One-time chain setup
The contracts in [Deployments.md](Deployments.md) are already deployed; skip to step 6 to reuse them.
```powershell
cd contracts; pnpm deploy                 # only for a fresh deployment (writes contracts/deployments/galileo.json)
cd ..\officer
pnpm setup-chain                          # 0G: register airframe, permit, model + prompt hashes
pnpm arc-setup                            # Arc: bind operator, lock the bond (ARC_BOND_USDC=30 to top up)
```
The Arc escrow is built in Arc Studio; its address goes in `ARC_ESCROW_ADDRESS`.

### 6. Run (four terminals)
```powershell
cd officer; pnpm officer          # :8787  flight computer
cd officer; pnpm evidence         # :8788  evidence server
cd officer; pnpm cre-runner       #        automatic Chainlink judge
cd web; pnpm build; pnpm start    # :3000  website
```
Open http://localhost:3000. Fly from **Live → Start flight**, or:
```powershell
cd sim; .venv\Scripts\python.exe mission.py --scenario people_below --gui
```
Scenarios: `normal`, `people_below`, `network_down`, `geofence_breach`, `blocked`, `full`.

### 7. Check
```powershell
cd web; pnpm test                 # 28
cd officer; pnpm test             # 8
cd cre\judge\verdict; bun test    # 9
cd contracts; pnpm test           # 8
cd officer; pnpm replay <flight-id>          # rebuild from 0G Storage, verify against 0G Chain
pnpm claim <flight-id>                        # file + close a claim as the test victim
```

## C. Host it (Vercel + your laptop)
1. Keep the four services from B.6 running.
2. VS Code → **Ports** → forward **8787** and **8788** → right-click → **Port Visibility → Public**.
3. Vercel → **Import** the repo → **Root Directory `web`** → env:
   - `NEXT_PUBLIC_OFFICER_WS` = `wss://<id>-8787.<region>.devtunnels.ms`
   - `NEXT_PUBLIC_EVIDENCE_URL` = `https://<id>-8788.<region>.devtunnels.ms`
4. Deploy. Keep the laptop awake and online during judging.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| Live: "NO_DECISION ZG_UNREACHABLE", flight not sealed | internet/DNS dropped; reconnect (phone hotspot) and fly again |
| "Officer offline" on the hosted site | laptop asleep, VS Code closed, or ports not Public |
| Report page: "drone cannot take new reports" | bond below cap: `ARC_BOND_USDC=30 npx tsx src/arc-setup.ts` |
| Claim stuck on "checking" | is `pnpm cre-runner` running? is `cre login` valid? |
| `EADDRINUSE` | an old officer/evidence process still runs; stop it |
| Opening a tunnel URL shows "Upgrade Required" / JSON error | normal: they are services, not pages |
