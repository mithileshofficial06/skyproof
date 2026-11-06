# SkyProof: who uses the website and how to make it simple

*6 Nov 2026. Goal from the mentor: the UI should be simple, not too complex.*

## The problem today

The website is built around **how SkyProof works** (flights, live console, 3D replay, hashes, 0G anchors). It is not built around **what each person came to do**. The nav shows six equal links: Overview, Flights, Live, File a claim, Insurer, 3D experience. A person who was hit by a package has to work out which of those is for them.

The claim page shows the drone ID, operator bond, payout cap and USDC balance. Then it asks the person to sign three blockchain steps: "Approve 1 USDC deposit", "Open claim on Arc" and "Close claim window". A victim doesn't know what any of that means and shouldn't have to.

## Who uses it

| # | Person | Why they come | What they need to see | What they don't need |
|---|---|---|---|---|
| 1 | **Victim**: a member of the public who was hurt or whose property was damaged | To report what happened and get compensated | A short form, a claim number, a status, and a plain-English answer with the proof behind it | Flight lists, the live console, 3D, hashes, bond and cap |
| 2 | **Reviewer**: the insurer or claims handler | To decide each claim fairly and quickly | An inbox of claims, each one with the matching flight evidence already attached, and Approve / Reject with a reason | The live console, the 3D experience |
| 3 | **Drone operator**: the delivery company | To keep its drones insured and answer complaints | Its drones, its bond, its flight records, and the complaints against it | The victim form |
| 4 | **Auditor or regulator** (and hackathon judges) | To check that the records can't be faked | Flights, replay, the tamper test, on-chain links, the live demo | Nothing to hide here: this is where the technical depth belongs |

Most visitors are person 1, and that is the screen that matters most. Only person 4 needs the technical pages.

## The victim's journey (the main flow)

```
Home ──► "I was affected by a drone"
          │
          ▼
  1. What happened?      date & time · place (pin on a map) · what happened (text) · photo (optional) · contact
          │
          ▼
  2. Submit              ──► "Claim #12 received. We found the drone that was there at that time."
          │
          ▼
  3. Track my claim      Received ──► Under review ──► Decision ──► Paid
          │
          ▼
  4. The reply           "Approved. The drone's own record shows it dropped the package at 4:12 AM,
                          3 m from where you were. 5 USDC has been sent to you."
                          [ See the proof ▸ ]   ← expands to the flight replay and on-chain links
```

Rules for this flow:
- **One question per screen, in plain words.** No "bond", "cap", "escrow", "anchor" or "claim window".
- **The victim never picks a flight.** They give the time and place, and the system finds the flight that was there. (Today claims are tied to whichever flight was most recent when they were filed; see finding A4 in [Arc_Review_2026-11-06.md](Arc_Review_2026-11-06.md). This change fixes that too.)
- **Hide the blockchain steps.** Do the approve, file and close steps in one action, or have the backend send them for the victim (gasless or relayed). The deposit should be one line: "A refundable 1 USDC deposit stops spam."
- **The answer comes with proof, but the proof is folded away.** The plain-English verdict comes first and "See the proof" second. The 0G and Arc evidence is still there for anyone who wants it.

## The reviewer's journey

```
Reviewer inbox ──► Claim #12 ──► one page showing:
                                   • what the victim said (time, place, photo)
                                   • what the drone's record says at that time and place
                                   • the automatic judge's result (BREACH / REVIEW / CLEAR) and why
                                   • [Approve & pay]   [Reject + reason]
```

The reviewer's reason and the evidence go back to the victim as "the reply".

## The new site map

| Who | Pages | Where in the nav |
|---|---|---|
| Everyone | **Home**: one sentence on what SkyProof is, then three big buttons: *I was affected by a drone* · *I review claims* · *I operate drones* | Logo |
| Victim | **Report an incident** (`/claim`) · **Track my claim** (`/claim/[id]`, new) | Main nav |
| Reviewer | **Reviewer inbox** (`/insurer`) | Main nav, or reached through the Home button |
| Operator | **My drones** (bond, flights, complaints) | Home button |
| Auditor / judges | **How it works** (the current home sections), Flights, Live, 3D experience | One link: "For auditors" / "How it works" |

The main nav drops from 6 links to 3: **Report an incident · Track my claim · How it works**.

Don't delete Flights, Live or 3D. The 0G and Chainlink judges need them for the demo. Just move them out of the victim's way.

## Build plan (in order)

1. **Nav and Home** (small): cut the nav to 3 links and put the three role buttons at the top of Home. Move today's Home sections under "How it works".
2. **Simple claim form** (medium): rewrite `/claim` as a 3-step form (what happened → where and when → contact), plus one "Submit" that runs all the wallet steps. Show the deposit as a single line. Remove the Stat cards (drone, bond, cap, balance) from the victim's view.
3. **Track my claim** (medium): add a new `/claim/[id]` page with a 4-step status bar and the reply in plain English, with "See the proof" folded underneath.
4. **Find the flight from time and place** (medium, also a correctness fix): when a claim is filed, match it to the flight that was near that place at that time, not to the latest flight.
5. **Reviewer page** (small): put the victim's statement, the matched flight evidence and the judge result next to each other, with Approve / Reject + reason.
6. **Operator page** (optional, after the hackathon): drones, bond, complaints.

For the demo, steps 1–3 give most of the "simple" feeling. Steps 4–5 make the story true end to end.

## One check before building

On-chain, a claim still needs a wallet and a 1 USDC deposit. A real victim won't have a wallet. Pick one:
- **Demo:** keep a pre-funded demo wallet and say so on screen ("demo wallet").
- **Real product:** have the backend file the claim for the victim (relayed or gasless), or use Circle wallets with email sign-in. This also helps with finding A7 in the Arc review (little use of Circle tooling).
