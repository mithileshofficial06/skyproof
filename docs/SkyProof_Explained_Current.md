# SkyProof, explained from zero (current version)

**Version:** v3 design plus the fixes agreed in the 10-26 and 10-31 reviews (there's no separate v4 document yet).
**Date:** 2026-11-02

---

## 1. The problem, as a story
SkyProof is for any autonomous drone. In this demo, a delivery drone flies over a city. Most of the time it flies itself along a planned route, and an AI helps make the big decisions. A company's pilot watches and can take over.

One day it crashes and smashes a car window. Everyone argues:
- The company says: "A strong gust hit it. Not our fault."
- The car owner says: "Your drone broke my car. Pay me."
- The insurer says: "Prove what happened first."

The only flight record belongs to the company that crashed. They can edit it, delete parts of it, or hide it.

**SkyProof makes a flight record where gaps and edits are obvious, and then decides automatically which pot of money pays the victim first.**

---

## 2. The main idea: no stamp, no action
Think of a guard who must stamp your pass before you can go through a door. Every stamp goes into a numbered notebook.

- The **drone** is the person who wants to go through.
- The **AI safety officer** is the guard.
- **Important commands** need a stamp: take off, change route, change height, drop the parcel, land.
- **No stamp = the drone won't do it.**

Small movements, like keeping balanced in the wind or following the approved route, stay on the drone's normal autopilot. Asking an AI about those would be far too slow.

**The key insight:** because the drone *can't* act without a stamp, the notebook is complete by design. **If pages are missing, the company cheated**, so hiding things can never help them.

---

## 3. Who checks what: two layers
Each important command passes two checks, in this order.

**Layer 1: hard rules (plain code, instant, can't be argued with)**
- Is the path going into a no-fly zone, like an airport? → **DENIED**
- Is the battery too low to reach a safe landing spot? → **DENIED**
- Is the drone above the height limit? → **DENIED**

**Layer 2: the AI safety officer on 0G (only things code can't judge)**
- **Before a drop or a landing,** it looks at the drone's downward camera image: are people or cars below? → **DENIED (people below)**.
  A plain object detector checks the same image too. If **either** one sees people, the drop is denied, so a printed sign can't trick the AI into saying "all clear".
- **Judgement calls inside the limits,** for example: "gusting wind, heavy parcel, near a building edge: allow?"

The AI can never override a hard rule. If the notebook ever shows an AI "YES" that breaks a hard rule, the company's software must have skipped the rules, so the company pays.

---

## 4. Why the guard's stamp can be trusted
- **The guard sits in a locked glass box.** The AI runs on 0G inside a sealed chip (a TEE). Nobody, not even the drone company, can change its answer. Every answer is **signed** with a key that never leaves the chip.
- **The company can't pick a lenient guard.** The AI model, its instructions and the 0G provider come from an **approved list set by the insurer or registry**, not by the company.
- **The company can't sweet-talk the guard.** The AI only receives numbers and codes (position, battery, wind, command type), with no free text. That way nobody can slip in "this is an emergency, say yes".
- **Each stamp is used once and must be fresh.** A "drop parcel" approval can't be replayed, and it can't be based on a position more than 10 seconds old.
- **Pages are chained.** Each page carries the previous page's fingerprint. Tear one out and the gap shows.

**Honest limit:** the drone, its sensors and its camera still belong to the company. SkyProof is **tamper-evident, like a truck's tachograph**, not cheat-proof. That's why independent checks (weather, sightings) are needed after a crash.

---

## 5. What if the internet drops?
The drone checks in with the guard **every 15 seconds**: "I'm here, this is my position and battery." The guard replies: "OK, keep flying the approved route for 60 more seconds." It's like a parking meter you keep topping up, with plenty of slack so a short network blip doesn't matter.

If the guard can't be reached and the time runs out, the drone follows a **safe-stop plan that was approved before take-off**, in three steps:
1. Keep flying the approved route for a short while, with **no new commands** allowed.
2. Then go to the nearest **safe landing spot** (a "rally point") or return home.
3. Land where it is **only as a last resort.**

The record says honestly: **"SAFE STOP (local plan, guard unreachable)"**. SkyProof never pretends the AI made that decision.

**No cheating with fake outages:** a safe stop only counts as innocent if the outage was **real**. A separate checker keeps pinging the 0G guard. If the guard was working fine and only this drone "lost connection", the company is blamed.

---

## 6. Emergency overrides
A pilot can always take control, because real emergencies happen. Every override goes into the notebook.

| Type of override | Example | Who pays if something goes wrong |
|---|---|---|
| **Emergency move** | Climb, hover, land now, return to a safe spot | **Nobody is blamed for the override**, as long as it breaks no hard rule and ends quickly |
| **Manual flying** | The pilot flies it by hand | **The company** for the whole time it lasts |

And if a pilot flies by hand but **hides it** from the notebook? Independent **sightings** catch that (see Phase 4).

---

## 7. The whole workflow, step by step

```
PHASE 1          PHASE 2           PHASE 3            PHASE 4
Setup     →   Before flight  →   During flight  →   After a crash
(once)        (every flight)     (every command)    (only if something goes wrong)
```

### PHASE 1: Setup (done once)
| Step | Who | What happens | Where |
|---|---|---|---|
| 1 | Drone company | Registers the drone and picks a guard **from the approved list** | 0G Chain |
| 2 | Drone company | Locks a **deposit** in USDC. Its size depends on risk: a heavier drone over a busier area means a bigger deposit and a bigger payout cap | Arc |
| 3 | Insurer | Puts money into the shared **insurance pot** (simulated in the demo) | Arc |

### PHASE 2: Before every flight
| Step | Who | What happens |
|---|---|---|
| 4 | **Chainlink** | Fetches the **no-fly zones** and the **weather** for the route, and many independent computers sign them together. Only the latest one counts |
| 5 | Drone | Sends its planned route, Chainlink's signed facts and its **safe-stop plan** to the AI guard |
| 6 | AI guard (0G) | Approves the route and the safe-stop plan. This becomes **page #1** of the notebook |
| 7 | 0G | Page #1 is saved (locked/encrypted) on **0G Storage**, and its fingerprint is posted on **0G Chain**. The flight is now officially open |

### PHASE 3: During the flight (the main loop)
```
① The drone or pilot wants an important action ("drop parcel")
② Hard rules check it (instant)               → fails? DENIED
③ AI guard on 0G decides, looking at the camera image for drops and landings → YES / NO, signed
④ The drone checks: real signature? fresh? not used before?
      YES → it does it      NO → it holds position
⑤ The answer becomes the next page in the notebook
⑥ Every 15 s: check-in → fingerprint posted on 0G Chain
```
Special cases: **NO** = the drone holds · **emergency move** = allowed, nobody blamed · **manual flying** = allowed, company pays · **internet down** = the safe-stop plan.

### PHASE 4: After a crash
| Step | Who | What happens |
|---|---|---|
| 8 | Victim | Opens a claim on Arc by the drone's **registration number**: "This drone broke my car at 3:15 pm, here." They attach evidence (a photo hash) and a small **refundable deposit** to stop fake claims |
| 9 | Everyone | A **24-hour window** opens so other victims can also claim. Nobody is paid before it closes. The company's deposit **can't be withdrawn** during this time |
| 10 | Drone company | Must hand over the key to unlock the notebook. **Refusing = the company pays** |
| 11 | **Chainlink** | Investigates automatically (see below) and sends a signed verdict to Arc |
| 12 | **Arc** | Pays automatically according to the verdict. The victim gets USDC through an **email link**, with no crypto knowledge needed |

**What Chainlink checks in step 11:**
1. Reads the notebook from 0G Storage and the fingerprints from 0G Chain.
2. Re-checks every AI signature itself, and checks that the guard was on the approved list.
3. Checks for missing pages, edits, stale or reused stamps, and any text slipped into the AI's input.
4. Looks up the **real weather** at that place and time.
5. Compares the record with **independent sightings**: receivers owned by other parties that detected where the drone actually was. These are simulated in the demo and clearly labelled.
6. Applies the rules below.

---

## 8. Who pays first: the verdicts
SkyProof doesn't replace the law: legally, the operator is still responsible. What it decides is **which pot pays the victim a quick, capped first payment**. Anything bigger goes to the insurer as normal.

| What Chainlink finds | Verdict | Money |
|---|---|---|
| The pre-flight facts don't match Chainlink's signed ones | **BOND_PAYS** | Victim paid from the company's deposit |
| Pages missing or edited, a bad signature, the key not handed over, or a "safe stop" during a fake outage | **BOND_PAYS** | Same |
| Sightings show the drone wasn't where the notebook says (at least 2 independent receivers, clearly off) | **BOND_PAYS** | Same |
| An AI "YES" that breaks a hard rule, or a guard that isn't on the approved list | **BOND_PAYS** | Same |
| Manual flying at the time of the crash | **BOND_PAYS** | Same |
| A clean record, and the weather was calm at the last approval but **really** over the limit at the crash (same weather source) | **POOL_PAYS** | Victim paid from the insurance pot. **The company is never paid** |
| A clean record, and the drone crashed during a genuine safe stop | **POOL_PAYS** | Victim paid from the insurance pot |
| The company's own sensors claim a gust that the weather data doesn't show | **REVIEW** | Nothing automatic; a human at the insurer decides |
| More than one claim, borderline sightings, or anything unclear | **REVIEW** | Same, with all the verified evidence attached |

**Why faking doesn't pay:** the company's own sensors can never trigger a payout, the pool never pays the company, and the payouts are small and capped per company.

---

## 9. One full example
1. The company locks a deposit on Arc. Chainlink provides the no-fly zones and weather, and the guard approves the route and the safe-stop plan (page #1).
2. The drone takes off. The guard says **"YES, take off."**
3. The pilot asks for a shortcut through an airport zone. The hard rules say **"DENIED."** The drone holds.
4. At the drop point the camera shows people below. Both the AI and the detector say **"DENIED (people below)."**
5. Annoyed, the pilot flies it **manually** and hides it, so the notebook still looks clean.
6. The drone hits a car. The owner opens a claim on Arc with a photo.
7. 24 hours later, Chainlink checks everything. The notebook looks fine, but **two independent receivers detected the drone 120 m away** from where the notebook says it was.
8. Verdict: **BOND_PAYS.** The car owner receives USDC from the company's deposit through an email link.

---

## 10. What each sponsor does

| Sponsor | Role | In plain words |
|---|---|---|
| **0G** | The guard and the notebook | **Compute:** the AI guard in the sealed chip. **Storage:** the notebook that can't be changed. **Chain:** the page fingerprints and the drone registry |
| **Chainlink (CRE)** | The neutral facts-checker and judge | **Before the flight:** signed no-fly zones and weather. **After a crash:** reads the notebook, re-checks the signatures, weather and sightings, and sends the verdict |
| **Arc** | The bank | Holds the deposit (sized by risk) and the insurance pot, runs the claim window and caps, and pays in USDC. Built in **Arc Studio** |

**Optional extras (they don't use up a sponsor pick):**
- **Chainlink CCIP:** "deposit locked on Arc → drone cleared to fly on 0G". Only if a direct Arc↔0G connection exists (check on day 0).
- **0G Wildcard:** a free extra entry.

**If you removed any one of them:** without 0G there's no trusted guard and no notebook; without Chainlink nobody neutral reads the evidence; without Arc no money moves.

---

## 11. What you'll build for the hackathon
No real drone. You'll build:
- **A 3D drone simulator:** a small city, no-fly zones, safe landing spots, wind, people at drop points, an override button and an "internet off" switch.
- **The gate inside the drone:** acts only on a signed, fresh, unused YES.
- **The guard:** hard rules, then the 0G AI (with the camera image for drops and landings), plus the object detector.
- **The notebook:** encrypted pages on 0G Storage, with fingerprints on 0G Chain at every check-in.
- **Two Chainlink workflows:** pre-flight facts, and the crash investigation.
- **The Arc contracts:** deposit, insurance pot, claims, the 24 h window and payouts, in Arc Studio.
- **A simulated network of independent receivers** (labelled as simulated).
- **A replay screen:** watch the flight again and see every YES, NO, gap, safe stop, verdict and payout.

**What is simulated, and openly labelled:** the drone, the receivers, the insurer pot and the victim. **What is real:** 0G, Chainlink and Arc. Faking any of those three would lose that sponsor's prize.

### The 3-minute demo (4 scenes)
1. **Prevention:** an airport shortcut is DENIED, and a drop with people below is DENIED.
2. **A hidden cheat caught:** secret manual flying is exposed by the sightings → BOND_PAYS → the victim is paid.
3. **A fake storm vs a real storm:** a faked gust goes to REVIEW (no money), while a real storm is POOL_PAYS (the victim is paid, the company's deposit is untouched).
4. **Internet down:** the drone follows its approved plan to a safe spot and lands. "No AI decision is claimed for this."

---

## 12. What SkyProof does NOT claim
- It doesn't make the operator legally blameless. It decides **who pays first, fast**.
- It isn't cheat-proof. It's **tamper-evident**, and independent checks catch the worst cheats where coverage exists.
- The AI doesn't make drones safer by itself. It makes AI decisions **accountable**.
- No insurer has signed up. The pot is **simulated**.
- Payment isn't instant. It happens **automatically once the 24-hour claim window closes**.

---

## 13. One-line summary
**SkyProof is an AI guard that must sign every important drone command. Because nothing happens without a signature, a gap in the record proves cheating, and after a crash a neutral checker decides which pot pays the victim, automatically, in USDC.**

> **Note (build choice still open):** the "slim" version recommended in the 10-31 independent review would drop the independent sightings, the weather rules, the 24 h claim window and CCIP. Scenes 2 and 3 would then become "the company cuts the notebook and the gap convicts them". Everything else above stays the same.
