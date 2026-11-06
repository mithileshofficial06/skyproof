# 06 · Simple UI plan (role-based)

Mentor feedback (6 Nov 2026): the integration is good, but the website must be simple and easy to understand for the person using it.
Rule: **one person, one job, one screen at a time.** Tech proof stays available, but behind a "See the proof" button.

## 1. Who uses SkyProof

| Who | What they want | What they must NOT have to see |
|---|---|---|
| **Victim** (person hurt or property damaged by a drone) | report what happened, follow the status, get paid | live flights, hashes, CRE commands, bonds, chain names |
| **Insurer / claims reviewer** | a list of claims, a plain summary of each, approve or reject with a reason | raw records, terminal commands |
| **Drone operator** (delivery company) | watch flights live, see their black box records, see claims against them | — (this is the technical user) |
| **Anyone checking** (regulator, journalist, judge) | prove a flight record was not changed | — (one "Check it yourself" page) |

## 2. New site map

```
Home  ──  "What do you need?"  (3 big cards)
 ├─ I was affected by a drone   → /report        (victim)
 │                                /track/<id>    (victim follows the claim)
 ├─ I review claims             → /insurer       (insurer inbox → /insurer/<id>)
 └─ I run drones                → /operator      (live + flights, the current tech pages)
Small footer links: How it works · Check a record yourself · 3D story
```

Nav shrinks to: **Report an incident · Track my claim · For insurers · For operators**.
Live, Flights and 3D move under "For operators" (they stay for the demo, they leave the victim's path).

## 3. Victim flow (the main fix)

**/report: 3 short steps, no wallet jargon up front**
1. **What happened?** date and time, place (pick on a small map or type an address), what was damaged, short description, photos.
2. **How do we pay you?** wallet address *or* "Connect wallet" (one line of help: "Payouts are sent in USDC").
3. **Check and send** → shows a claim number, e.g. `Claim #6`.

**/track/<id>: one status timeline, plain words**
```
✓ Received            6 Nov, 10:45
✓ Drone record found  The drone's sealed black box covers this time
● Decision            Approved: the drone dropped the package without permission
○ Paid                5 USDC sent to your wallet
```
Each decision has **one sentence why** and a **"See the proof"** button that opens a short replay clip of the moment
plus the plain-English flight summary. Hashes and transaction links only appear inside "Technical details".

Possible outcomes in victim words:
- **Approved, paid automatically**: the record shows the drone broke a rule (judge = BREACH).
- **Under review by the insurer**: the record does not show a clear rule break (REVIEW). An expected time is shown.
- **Answer from the insurer**: approved or rejected, with their written reason and the proof they used.

### Agreed decision rules (6 Nov 2026)

The Chainlink judge compares the complaint (time + place) with the drone's 0G record. **It pays or passes to the insurer. It never rejects on its own.**

| Judge finds | Result | Flag the insurer sees |
|---|---|---|
| Time + place match, drone broke a rule | **Auto-pay** (capped) | — |
| Time + place match, no rule broken (e.g. a gust) | Insurer | "Drone was here — no rule broken" |
| Time or place does not match | Insurer | "⚠ Drone was 400 m away at that time — likely false claim" |
| No sealed flight at that time | Insurer | "No drone record covers this time" |

Why no auto-reject: an honest victim may enter the time slightly off, or GPS may drift. Payment is automatic only when the proof is strong;
a rejection always comes from a human, with a written reason that the victim sees.

New judge check (closes the fake-claim hole): the claimed place must be within ~25 m of the drone's recorded position within ±2 min of the claimed time.

## 4. Insurer flow

**/insurer: inbox**, one row per claim: claim number, date, status chip (`Needs review`, `Paid`, `Rejected`), amount.
**/insurer/<id>: one case page**
- Top: one-paragraph summary ("Drone SKY-001 was over the drop zone at 10:42. 0G saw a person and said DENY. The drone waited and dropped at 10:44.")
- Automatic judge result and its reasons, in words.
- The victim's description and photos, next to "What the drone saw" (the camera frame).
- Two buttons: **Approve & pay** / **Reject**, plus a required reason box. The reply goes to the victim's track page.

## 5. Operator area

The current `/live` and `/flights` pages move here almost unchanged (this user wants the detail).
Add one "Claims against my drones" list.

## 6. Writing rules for all victim/insurer screens

- No words: hash, anchor, CRE, bond, nonce, segment, calldata. Use: *record*, *sealed*, *proof*, *automatic check*, *payout*.
- One main button per screen. Big, plain labels ("Send my report", "Approve & pay").
- Status always as a timeline with dates, never as raw events.
- Every technical item lives under a closed "Technical details" section.

## 7. Demo story (3 actors, 3 tabs)

1. **Victim tab:** file a report in 30 s → claim number → track page says "Checking the drone's record…".
2. **Automatic check** runs (Chainlink judge on the 0G record) → victim page flips to **Approved, paid** with the proof clip.
3. **Second claim** with no clear rule break → **Insurer tab** shows it in the inbox → insurer rejects or approves with a reason → victim page shows the answer.
4. Optional: **Operator tab** for the live flight, and "Check it yourself" for judges.

## 8. Build order

1. Home with 3 cards + new nav.
2. `/report` (3 steps; reuse the current claim contract call, hide the CRE/bond panels behind "Technical details").
3. `/track/<id>` timeline (reads the claim from Arc + the judge result + the insurer's reply from 0G Storage).
4. `/insurer` split into inbox + case page, with plain summary on top.
5. Move Live/Flights/3D under `/operator`; reword the remaining pages by the writing rules.

Note: in the demo, the "automatic check" step is still started by running the CRE workflow from a terminal
(CRE simulation). The victim page will show "Checking…" until the result lands on Arc.
