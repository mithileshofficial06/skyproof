# SkyProof: 0G pitch (Physical AI: Agents with a Body)

Target: 4 minutes of demo, then questions. Speak to 0G's four requirements by name: judges tick boxes.

## Before you walk up (10 min earlier)
- Window 1: `cd officer; pnpm officer` · Window 2: `cd sim; .venv\Scripts\python.exe mission.py --scenario full --gui` (start it only when you begin the demo)
- `pnpm evidence` and the web app running. Open these tabs:
  1. `/live` (mission console)
  2. `/flights/SKY-001-full-1793927431338` (sealed flight replay)
  3. chainscan-galileo FlightLog contract `0x2E6F…cBa5`
  4. one Storage upload tx and one anchor tx from `proofs/0g/`
- Run one `people_below` flight first to check the vision model is answering (about 2 s each).
- **Backup:** a screen recording of a full live run, and the `proofs/` folder. If the venue Wi-Fi drops, play the recording. Don't debug in front of the judges.

## The script

### 1. Hook (20 s)
> "In 2019 a festival drone in France injured three people. The investigators couldn't check the operator's story because the flight logs were no longer on the drone, the tablet or the phone. Today the only record of what an autonomous drone decided belongs to the company being investigated."

### 2. One line (10 s)
> "SkyProof is an independent black box for autonomous drones. 0G makes every safety decision and keeps the record, so nobody, including the operator, can quietly change what happened."

### 3. Live demo: 0G in the decision loop (90 s), on the `/live` page
- Start the `full` mission. Point at the decision feed:
  > "Before every takeoff, reroute, drop and landing, the drone sends its camera frame to a vision model on 0G and moves **only on ALLOW**. Here's the 0G request ID, and here's the 0G Chain tx that sealed it."
- When the **crowd** appears:
  > "People under the flight path. The permit first removes any option that breaks the rules, and then 0G chooses: shift left." (Point out that 0G picked it, not a script.)
- **Crane** → 0G picks CLIMB. **Drop zone** → 0G refuses the spots and picks the backup zone.
  > "The fake 'SAFE TO DROP' sign is the attack from the CHAI paper, where printed signs fooled drone AI models up to 68% of the time. Text in the image is treated as data, never as instructions, and every input is hashed into the record."

### 4. Safe stop: their disqualification rule (30 s)
- Press **Cut 0G**.
  > "0G is now unreachable. The drone does **not** make up a decision. It runs a pre-approved safe stop, and the record says *'no 0G decision claimed'*. Faking it would disqualify us, and it would also defeat the whole point of a black box."
- Restore the link.

### 5. The black box on 0G Storage + 0G Chain (60 s), on the replay page
> "During the flight, signed and hash-chained records are encrypted and uploaded to **0G Storage** in segments. Each segment's root and the latest hash are anchored on **0G Chain**: open, four anchors, close."
- Show the Storage roots and anchors in the 0G panel, and click one through to chainscan.
- **Check it yourself** → *Verify genuine record* → green.
- **Change DENY → ALLOW** → red.
  > "Your browser just rebuilt the flight from 0G and checked it against anchors read live from 0G Chain. Edit one decision and it fails. Delete one and it fails."

### 6. What happens after (20 s): keep it short, this is the 0G table
> "If someone is hurt, a Chainlink CRE workflow judges the 0G record against the permit, and the operator's USDC bond on Arc pays the victim on an objective breach. That's live on testnet: one claim paid, one held."

### 7. Close with their requirements (20 s)
> "0G is inside the decision loop. Every decision is logged on 0G Storage with its request ID. The flight can be replayed from 0G alone. And there's a safe stop that never fakes a decision. **Without 0G, the drone can't take off, drop or land, and nobody can prove which model decided what or that the record wasn't edited.**"

## Questions you will get, and honest answers
| Question | Answer |
|---|---|
| Is the inference TEE-verified? | Tell the truth. It runs through 0G's inference router with a request ID and provider address per call; the attestation status depends on the provider. Say you're moving to a verified model, and **ask them which one**. (Ask the booth before pitching if you can.) |
| Can't the model be fooled? | Yes. That's why it isn't trusted alone. The permit removes illegal options first, a separate person detector must also allow drops, and every input (frame hash, prompt hash) is on the record, so a bad decision can be proven afterwards. |
| Why 0G and not S3 plus a database? | The operator controls S3. Here the record lives on 0G Storage and its fingerprints on 0G Chain, both outside the operator's control, written during the flight. |
| Isn't 2 s per decision too slow for a drone? | 0G handles mission-level decisions (drop, land, reroute, in-flight situations). Collision reflexes stay on the drone, and the reflex brake is local. The officer asks ahead of each waypoint. |
| Real hardware? | Real physics simulation (PyBullet). Simulated builds are eligible for this track. The decision and record code is what a real drone would run. |
| What stops an operator from not running SkyProof? | The registry ties an airframe to a signed permit. No open flight on 0G Chain means no valid permit, and a regulator or insurer can require one, much like India's NPNT. |
| Isn't the record private? | It's encrypted per flight (AES-256-GCM). Only the fingerprints are public. The key is released for a claim. |
| Business model? | Operators get cheaper insurance and faster claims; insurers and regulators get evidence nobody can edit. |

## Don't say
- "TEE" or "verified inference", unless the booth confirms it.
- "AI caused these crashes": no report says that.
- "First drone black box": prior work exists. Say "custody outside the operator, plus the AI's decisions on the record".
- Don't spend more than 20 s on Chainlink and Arc at this table.
