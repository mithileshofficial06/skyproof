# 05a: UI/3D decisions (owner-approved 2026-11-06)

`specs/05-uiux.md` was written before it met this repo. These decisions resolve its conflicts with the real code.
Where they differ, this file wins. The source of truth is the code (no specs/00-04 or 06-08 exist).

| # | Spec says | Decision | Why |
|---|---|---|---|
| D1 | Two Truths hashes GPS `Sample`s with `encodePacked` (its own scheme) | Use **real sealed flights**. A "block" is a real signed record; its hash is `keccak256(canonicalJSON(record without hash, sig))`, linked by `prev`, signed by the operator, and segment heads are anchored on FlightLog (0G Galileo, `getAnchors`). | Only then can the page truthfully say "matches what's on 0G". The spec's scheme would never match. |
| D2 | `/` route | Build at **`/experience`**. The Mission Control home stays at `/`. | `/` is taken; the spec says build alongside and ask before replacing. |
| D3 | Paths `web/app`, `web/lib`, `web/components` | Same layout under **`web/src/`** (`src/app/experience`, `src/lib/data`, `src/components/canvas`, ...). | The app already uses `src/`. |
| D4 | GPS lat/lon to ENU | Real telemetry is in **simulator metres** (x east, y north, alt up) on a 1:50 city block. Scene mapping is `(x, alt, -y)`, then fit to a ~36-unit box. `geo.ts` (`toENU`) is still implemented and unit-tested for future GPS data. | The PyBullet sim has no GPS. |
| D5 | Tamper edits altitude/speed of a GPS sample | Edits apply to a **copy** of a real record: altitude or position of a STATE sample, or the verdict of a DECISION. Labelled "local simulation: an edit to a copy of a real sealed flight". | Honest, and the avalanche is the real one. |
| D6 | `forge test` baseline | **`pnpm test` in `contracts/` (Hardhat)** plus `officer/` tests and the web build. | The contracts use Hardhat, not Foundry. |
| D7 | npm | **pnpm** (lockfile present). No React/Next/Tailwind major changes; R3F v9 + React 19 already installed. | Section 0 rule 6. |
| D8 | Drone asset | **Option A, procedural drone** for `/experience`. The existing CC BY 3.0 GLB stays on Live/replay. | Spec default; no new licence. |
| D9 | Poly Haven HDRI file | drei **`Environment` with `Lightformer`s** (generated, no file). | No download, no licence, no network at runtime. |
| D10 | Visual direction | The spec's **near-black + one cyan accent** on `/experience` only. Sponsor colours only on the 0G / Chainlink / Arc stations. | Owner choice. |
| D11 | Chainlink explorer link | CRE runs as `cre workflow simulate --broadcast`, so there is no CRE explorer page. The **verdict tx on Arc** is the Chainlink evidence link. | Honest about what exists. |
| D12 | live adapter calls "backend per specs/04" | **live** = published flight JSON + anchors read live from 0G Chain + claims read from the Arc escrow. **replay** = published flight JSON with its exported anchors. No new endpoints. | Section 0 rule 7. |
| D13 | `AI_USAGE.md`, `CREDITS.md`, `prompts/`, `CLAUDE.md` absent | Created at the repo root. `CLAUDE.md` holds only the "## UI / 3D rules" section. | Section 0 rules 4 and 9. |
| D14 | Tamper ending "Verdict: FAIL -> Payment: BLOCKED" | **Honest ending**: the edited copy fails against the 0G anchors, the Chainlink judge ignores it and uses the sealed record on 0G; payment follows the sealed record. A broken or missing sealed record is itself breach B5 (pays the victim). | The judge reads from 0G, not from whoever hands over a copy. Owner choice. |
