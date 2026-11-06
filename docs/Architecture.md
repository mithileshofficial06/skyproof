# SkyProof: Architecture

Related: [TRD](TRD.md) (details) · [Deployments](Deployments.md) (addresses)

## 1. System overview

```mermaid
flowchart TB
  subgraph Laptop["Operator machine (flight computer)"]
    SIM["PyBullet drone<br/>sim/ + safety gate"]
    OFF["Officer :8787<br/>permit rules · 0G calls · signed record · sealing"]
    EV["Evidence server :8788<br/>records · claim evidence · insurer reasons"]
    RUN["CRE auto-runner<br/>watches Arc · runs judge"]
  end
  subgraph ZG["0G"]
    PC["Private Computer<br/>0gm-1.0-35b-a3b vision<br/>TEE: Intel TDX · sealed"]
    ST[("Storage<br/>AES-256-GCM segments")]
    CH["Chain (Galileo)<br/>DroneRegistry · FlightLog"]
  end
  subgraph CL["Chainlink"]
    CRE["CRE judge workflow<br/>rules B1–B6"]
  end
  subgraph ARC["Arc Testnet"]
    ESC["SkyProofEscrow (Arc Studio)<br/>USDC bond · claims · payouts"]
  end
  WEB["Website (Vercel)<br/>Report · Track · Insurer · Live · Replays"]
  OM["Open-Meteo"]

  SIM <-->|WebSocket + drone token| OFF
  OFF -->|frame + state| PC
  PC -->|ALLOW / DENY + request id| OFF
  OFF -->|encrypted segment every 15 s| ST
  OFF -->|open / anchor / close| CH
  WEB <-->|VS Code public tunnel| OFF
  WEB <-->|VS Code public tunnel| EV
  WEB -->|openClaim / closeClaimWindow / resolveHeld| ESC
  WEB -->|read anchors, verify in browser| CH
  ESC -->|ClaimWindowClosed| RUN
  RUN -->|cre workflow simulate --broadcast| CRE
  CRE -->|lookup + record| EV
  EV -->|download + decrypt| ST
  CRE -->|flights / getAnchors| CH
  CRE -->|wind at take-off hour| OM
  CRE -->|verdict via forwarder| ESC
```

## 2. One flight (decide → record → seal)

```mermaid
sequenceDiagram
  participant D as Drone (sim + gate)
  participant O as Officer
  participant Z as 0G Private Computer
  participant S as 0G Storage
  participant C as 0G Chain (FlightLog)
  D->>O: hello (scenario, drone token)
  O->>C: openFlight(airframe, permitHash, rec0Hash)
  loop each mission command / situation
    D->>O: request {nonce, cmd, state} + camera frame
    O->>O: permit hard rules (veto illegal)
    O->>Z: vision prompt + frame
    Z-->>O: ALLOW / DENY + request id
    O->>O: DECISION record (signed, hash-chained)
    O-->>D: verdict + requestHash + decisionHash
    alt fresh, matching, single-use ALLOW
      D->>O: ACTION (decisionHash)
    else no answer in 9 s
      D->>O: SAFE_STOP_LOCAL (hold, divert, land): no 0G decision claimed
    end
  end
  loop every 15 s
    O->>S: encrypted segment upload → storage root
    O->>C: anchor(flightId, seq, head, storageRoot)
  end
  D->>O: close
  O->>C: closeFlight(final head, root)
```

## 3. One claim (report → judge → pay)

```mermaid
sequenceDiagram
  participant V as Victim (website)
  participant E as Evidence server
  participant A as Arc SkyProofEscrow
  participant R as CRE auto-runner
  participant J as CRE judge workflow
  participant C as 0G Chain
  participant M as Open-Meteo
  participant I as Insurer
  V->>E: statement + photos → 0G Storage → evidence hash
  V->>A: openClaim(airframe, time, place, evidenceHash) + 1 USDC
  Note over A: 120 s claim window
  V->>A: closeClaimWindow (or the runner does it)
  A-->>R: ClaimWindowClosed
  R->>E: warm up (lookup + record)
  R->>J: cre workflow simulate --broadcast
  J->>E: which flight? → verify on 0G Chain
  J->>C: flights(id), getAnchors(id)
  J->>E: record → verify chain, signatures, anchors
  J->>M: wind at take-off hour
  J->>A: onReport(claimId, verdict, breachCode, reportHash) via forwarder
  alt BREACH
    A-->>V: cap (5 USDC) from operator bond + deposit back
  else REVIEW
    A-->>I: claim held
    I->>A: resolveHeld(approve / reject)
    I->>E: signed reason → 0G Storage (victim sees it)
  end
```

## 4. Trust boundaries

| Party | Trusted for | Not trusted for (checked instead) |
|---|---|---|
| Operator / officer | running the flight, holding the decryption key | the record content: hash chain + signature + 0G Chain anchors |
| Evidence server | availability | which flight (verified on 0G Chain) and the record (verified per record); withholding = B5 |
| 0G Private Computer | the decision itself (receipt = request id) | provider is TEE-attested (TDX, dstack) and the channel sealed, both recorded; per-response enclave signatures not yet re-verified |
| CRE workflow | rules + consensus | — |
| CRE forwarder | delivering the report | escrow accepts only the forwarder |
| Insurer | held claims only | cannot undo automatic payouts; reason is public |
| Website | presentation | every check (verify, track) reads chain data directly |

## 5. Data locations

| Data | Where | Format |
|---|---|---|
| Flight record (authoritative) | 0G Storage | AES-256-GCM JSONL segments; root per segment |
| Fingerprints | 0G Chain `FlightLog` | head hash + storage root per anchor |
| Working copy | `officer/.tmp/flights/<id>.jsonl` + `.manifest.json` | plain (git-ignored) |
| Decryption keys | `officer/.tmp/keys/<id>.key` | git-ignored |
| Published flights | `web/public/data/flights/` + `/site/flights/` on the evidence server | JSON, summary text |
| Claims, verdicts, payouts | Arc `SkyProofEscrow` | on-chain state + events |
| Victim evidence, insurer reasons | 0G Storage (+ cache in `officer/.tmp/claims/`) | JSON bundle; fingerprint on Arc |

## 6. Deployment topology

```
Judge's browser ──https──▶ Vercel (static Next.js site)
        │                         │ build-time env: tunnel URLs
        ├─wss──▶ devtunnels ──▶ laptop :8787 officer ──▶ sim (spawned)
        ├─https─▶ devtunnels ──▶ laptop :8788 evidence server
        ├─https─▶ 0G Galileo RPC (verify anchors in the browser)
        └─https─▶ Arc RPC + MetaMask (claims)
laptop: cre-runner ──▶ CRE CLI ──▶ Arc forwarder
```
