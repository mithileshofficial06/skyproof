# SkyProof: Contract deployment addresses

All contracts are on public testnets and can be opened in the explorers.

## 0G Galileo testnet (chain 16602) · explorer https://chainscan-galileo.0g.ai

| Contract | Address | Purpose |
|---|---|---|
| DroneRegistry | [`0xC3e0C4a5848c6b8754820286AF9805F6c4ca1Adf`](https://chainscan-galileo.0g.ai/address/0xC3e0C4a5848c6b8754820286AF9805F6c4ca1Adf) | airframe SKY-001, signed permit, allowed 0G model + prompt hashes |
| FlightLog | [`0x2E6F0f6f3121e3aA7984ffC292f80E75c937cBa5`](https://chainscan-galileo.0g.ai/address/0x2E6F0f6f3121e3aA7984ffC292f80E75c937cBa5) | per-flight open / anchor (head hash + 0G Storage root) / close |

Deployed 2026-11-05 (`contracts/deployments/galileo.json`). Admin `0xa4BCd1E1C08626412C3E66c23fe8B4dAD8aD7c6e`. Operator (signs records, pays 0G gas) [`0x69A5160E8bf27A2a9D8d17eaff0De079CfdFA12A`](https://chainscan-galileo.0g.ai/address/0x69A5160E8bf27A2a9D8d17eaff0De079CfdFA12A).

0G Storage: indexer `https://indexer-storage-testnet-turbo.0g.ai`, explorer https://storagescan-galileo.0g.ai (search a root hash).
0G Private Computer: router `https://router-api.0g.ai/v1`, model `0gm-1.0-35b-a3b` (TEE-attested: TeeML, Intel TDX, verifier dstack; sealed channel). Permit + model registered on 0G Chain 7 Nov: [setPermit](https://chainscan-galileo.0g.ai/tx/0xa8ed9b1de8de59f2790400b5643bbcff9c966f5e8fd539e9296bdd8a101d7dc5), [allow model + decision prompt](https://chainscan-galileo.0g.ai/tx/0x64986f5d8d6087817089c85ca0d5990881f3ab2a3e93d499be832accce61bb80), [allow model + situation prompt](https://chainscan-galileo.0g.ai/tx/0x14e3bd68ebf3a218eb7bb9511d05790197a8aeea85ad28e8b6c7a29ca0786951); calls listed on pc.0g.ai → Console → Activity (key "Skyproof").

## Arc Testnet (chain 5042002) · explorer https://testnet.arcscan.app

| Contract | Address | Purpose |
|---|---|---|
| SkyProofEscrow (built in Arc Studio) | [`0x10daa2dbded35f0056be1dbdbee908a12e4644d8`](https://testnet.arcscan.app/address/0x10daa2dbded35f0056be1dbdbee908a12e4644d8) | bond, claims, CRE verdicts, USDC payouts, insurer review |
| USDC | `0x3600000000000000000000000000000000000000` | settlement + gas |
| Chainlink CRE forwarder | `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` | only caller allowed into `onReport` |

Arc Studio project: https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm · deploy tx [`0x5b30d291…`](https://testnet.arcscan.app/tx/0x5b30d29117b3968f10ee0155758fe40f90c04a40680a04ccc58d4d4c8bb12d1a) (`contracts/deployments/arc.json`).

## Chainlink CRE

Workflow `verdict` in `cre/judge/` (CRE CLI v1.39), run with `cre workflow simulate … --broadcast -T staging-settings`. Not deployed to a DON (account has no deploy access); simulation is accepted by the track, and its verdicts are real writes on Arc.

## Key transactions

| What | Tx |
|---|---|
| Claim #1 BREACH → paid | [0xc996a439…](https://testnet.arcscan.app/tx/0xc996a439b0b1e7d0ebc7667992f3747863411c274218651d5932564eae675789) |
| Claim #2 REVIEW → held | [0xff9b97e4…](https://testnet.arcscan.app/tx/0xff9b97e456202c12b31f46f3fad6d093c677acab31bdb6bd4935626012a66cee) |
| Claim #8 REVIEW (auto-runner) | [0xbb608b5e…](https://testnet.arcscan.app/tx/0xbb608b5ecaaca43fa562ade29b069d06eef680b6e3a1298ddefb4917ce78dc26) |
| Claim #9 REVIEW (runner closed the window) | [0x8adcadd8…](https://testnet.arcscan.app/tx/0x8adcadd8456051dd7531e8c337aaa71a9127ea28290f2af4d8d65af8138173d6) |
| Claim #10 BREACH → paid (hosted-site flight) | [0x0f081515…](https://testnet.arcscan.app/tx/0x0f081515ef0436305d01c6697e09f19d94049fae75017187991ec48c7546f256) |
| Flight opened from the hosted site (0G Chain) | [0xd3d917e2…](https://chainscan-galileo.0g.ai/tx/0xd3d917e29d8a717f77b994b771d98a57cd778ade1b8b5e1828b3a3c2e993f96c) |

More: [`proofs/README.md`](../proofs/README.md).
