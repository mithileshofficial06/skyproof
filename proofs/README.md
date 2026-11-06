# SkyProof: proof pack (captured 6 Nov 2026)

45 screenshots and the raw terminal logs. Each on-chain item links to its explorer page, so anyone can check it again.
Explorers: 0G Galileo = chainscan-galileo.0g.ai · Arc Testnet = testnet.arcscan.app

## 0G (`0g/`)
| # | Proof | Link |
|---|---|---|
| 01–02 | DroneRegistry deployed + deploy tx | [contract](https://chainscan-galileo.0g.ai/address/0xC3e0C4a5848c6b8754820286AF9805F6c4ca1Adf) · [tx](https://chainscan-galileo.0g.ai/tx/0xd1910188546dbf495ed51785fd60d614a6148562c7e6bbe0178bfb4a4b333036) |
| 03–04 | FlightLog deployed + deploy tx (73 txs so far) | [contract](https://chainscan-galileo.0g.ai/address/0x2E6F0f6f3121e3aA7984ffC292f80E75c937cBa5) · [tx](https://chainscan-galileo.0g.ai/tx/0x5dc234c107e03b521c3e008bd71a6a482ec40660e9e89b4826ab16eca3af56a8) |
| 05 | `openFlight` for flight SKY-001-full-1793927431338 | [tx](https://chainscan-galileo.0g.ai/tx/0xb51d13405ac99cf2d452a78138bed311026417d55aee5d131560321c8cf33273) |
| 06a/b | 0G Storage uploads (encrypted record segments) | [seg 0](https://chainscan-galileo.0g.ai/tx/0x8f825e69d8ef23e4667df3dcf9523409f960e5c55b19fe210b2cdd8247f0e29e) · [seg 2](https://chainscan-galileo.0g.ai/tx/0xa2408face088d736cef572fcc6041bced9eb36951b13046413cd82cc37d47ff0) |
| 07a/b | Anchors (head hash + storage root) on 0G Chain | [anchor 0](https://chainscan-galileo.0g.ai/tx/0x3affd4a74e5c007d4936641294f96bb51e7cb8a9e6b5f4177008db2d84bb60a0) · [anchor 2](https://chainscan-galileo.0g.ai/tx/0x89d11f0fd5c161e50e1e87007624fd6e1814919d8723d56956ed91446cdd7f27) |
| 08 | `closeFlight` | [tx](https://chainscan-galileo.0g.ai/tx/0xbee257c9e540e6d557c310f1832b645ae0abc4aa031acf4b9aea3431c57f64a6) |
| 09 | `pnpm replay`: flight rebuilt from 0G Storage alone, 52 records, 13 0G decisions with request ids, every anchor matches | log |
| 10–11 | Tamper tests: DENY→ALLOW edit and a deleted record are both caught (B5_RECORD_BROKEN) | log |
| 12 | Live 0G compute call: qwen3.8-flash vision → ALLOW, with request id + provider | log |
| 13 | Operator wallet activity on 0G | [address](https://chainscan-galileo.0g.ai/address/0x69A5160E8bf27A2a9D8d17eaff0De079CfdFA12A) |
| 14 | Safe stop with 0G cut (flight SKY-001-network_down-1793918402552): 6× NO_DECISION, then HOLD → DIVERT → LAND, no 0G decision claimed. Record: `reports/flights/SKY-001-network_down-1793918402552.txt` | [open](https://chainscan-galileo.0g.ai/tx/0x0ca4b9af87cc214b4fb7f8029f319a24adbebe2a006cd32d2ea56e38eb7742ab) · [anchor](https://chainscan-galileo.0g.ai/tx/0x8a3a34eb9c33e9c26c0e559c286b6999ab7e5e797f24319c9ffec8c9c1671629) |

One-page map of 0G's four requirements to these proofs: [docs/0G_Proof_Sheet.md](../docs/0G_Proof_Sheet.md).

## Chainlink CRE (`chainlink-cre/`)
| # | Proof |
|---|---|
| 01 | CRE CLI logged in (v1.38.0). Shows **Deploy Access: Not enabled** |
| 02 | `cre workflow simulate` on claim #1 (live Arc trigger): reads 0G Chain + 0G Storage + Open-Meteo, outputs **BREACH** (B1 geofence, B3 unapproved action) |
| 03 | Same workflow on claim #2: **REVIEW** (no breach, funds held) |
| 04 | CRE forwarder on Arc `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` |
| 05–07 | The verdicts the workflow wrote on Arc (broadcast runs): `report` via the forwarder → `ReportProcessed` event with workflowExecutionId → escrow pays out. [claim 1 BREACH](https://testnet.arcscan.app/tx/0xc996a439b0b1e7d0ebc7667992f3747863411c274218651d5932564eae675789) · [claim 2 REVIEW](https://testnet.arcscan.app/tx/0xff9b97e456202c12b31f46f3fad6d093c677acab31bdb6bd4935626012a66cee) |

The re-runs in 02–03 were done **without** `--broadcast`, so they show `tx 0x000…`. Nothing new was written on-chain. The real writes are in 05–07.

## Arc (`arc/`)
| # | Proof | Link |
|---|---|---|
| 01 | Arc Studio share page "Sky Proof Escrow Contract" (header only: the embedded app renders blank headless) | [Studio](https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm) |
| 02–03 | SkyProofEscrow on Arc Testnet + deploy tx | [contract](https://testnet.arcscan.app/address/0x10daa2dbded35f0056be1dbdbee908a12e4644d8) · [tx](https://testnet.arcscan.app/tx/0x5b30d29117b3968f10ee0155758fe40f90c04a40680a04ccc58d4d4c8bb12d1a) |
| 04 | Operator bond: 10 USDC | [tx](https://testnet.arcscan.app/tx/0x5d765dad6549a723cc1bbb4ada14f53aadd9ed16c09866c504e83dc1454244c1) |
| 05–08 | Claim #1: file (1 USDC deposit) → close window (CRE trigger) → BREACH → victim gets 5 USDC + 1 USDC back | [file](https://testnet.arcscan.app/tx/0x2207c4b1900a9d423df79bcff339009e880dc6dfe5f5af4c55131dfab813947a) · [close](https://testnet.arcscan.app/tx/0x0c4d055350a43809f08672470d191361e7672f0f3900a8af0d6b525822250059) · [verdict](https://testnet.arcscan.app/tx/0xc996a439b0b1e7d0ebc7667992f3747863411c274218651d5932564eae675789) |
| 09–11 | Claim #2: file → close → REVIEW → held | [file](https://testnet.arcscan.app/tx/0x4275e82e7248dc63bb19dc51b130e3dd0f3d92c5505664346fb1cf46d27e0926) · [close](https://testnet.arcscan.app/tx/0x1779138e3128397bd6a8160629afeee28ac12c2f9125c8b0321491a13fe09955) · [verdict](https://testnet.arcscan.app/tx/0xff9b97e456202c12b31f46f3fad6d093c677acab31bdb6bd4935626012a66cee) |
| 12–13 | All USDC movements and forwarder calls into the escrow | |

## Tests (`tests/`) and web app (`web-app/`)
- Officer unit tests 8/8 pass; contract tests 8/8 pass.
- Web app screenshots from the local dev server: home, flight list, 3D replays with 0G/Chainlink/Arc proof panels, claim, insurer, live console.

## Gaps to know before submitting
1. **The CRE workflow is not deployed to a DON.** Your account shows "Deploy Access: Not enabled". The proof is the simulation plus its broadcast writes on Arc. Request access with `cre account access`.
2. **0G compute is not TEE-attested.** The call goes through router-api.0g.ai and returns `x-0g-e2ee: none`, `provider_identity: aliyun` (see 12). Don't call it "TEE" or "verified" unless the 0G booth confirms (CHECKLIST 0.14).
3. **The Arc Studio editor view is not captured.** Take one by hand while logged in to studio.arc.io.
4. **Two more claims (#3, #4) exist on the escrow** from today (02:15–02:31 UTC). They aren't documented in the README.
