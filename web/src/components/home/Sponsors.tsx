"use client";
// Sponsors: what we use, how it's built, why this network, and what breaks without it.
import { useState } from "react";
import { Reveal } from "@/components/motion";
import { cx } from "@/components/ui";
import { ARC_EXPLORER, ZG_EXPLORER } from "@/lib/flight";

interface Sponsor {
  key: string;
  name: string;
  job: string;
  color: string;
  uses: string[];
  how: string[];
  why: string;
  without: string;
  links: [string, string][];
}

const SPONSORS: Sponsor[] = [
  {
    key: "0g",
    name: "0G",
    job: "Decides and records",
    color: "#7c5cff",
    uses: ["0G Private Computer: vision model qwen3.8-flash (verified run) through the 0G router", "0G Storage: the encrypted black box", "0G Chain: DroneRegistry (signed permits) and FlightLog (anchors)"],
    how: [
      "Before TAKEOFF, REROUTE, DROP and LAND, and in every in-flight situation, the officer sends the camera frame and drone state to 0G and gets ALLOW / DENY or a choice, with a 0G request ID.",
      "A gate on the drone refuses any action without a fresh decision (10 s), matching nonce and request hash. No answer means a pre-approved safe stop, logged as “no 0G decision”.",
      "Every record is signed and hash-chained. Every 15 s the new records are AES-256-GCM encrypted, uploaded to 0G Storage, and the chain head + storage root are anchored on FlightLog.",
    ],
    why: "The decision and its record leave the operator's hands the moment they happen. Verified compute gives each decision an ID; storage plus chain give the record a custodian that isn't the operator.",
    without: "The operator's own servers hold the only log, as in every case above. Edits are undetectable, and nobody can prove what the drone saw or who approved the drop.",
    links: [
      ["FlightLog on 0G Chain", `${ZG_EXPLORER}/address/0x2E6F0f6f3121e3aA7984ffC292f80E75c937cBa5`],
      ["DroneRegistry", `${ZG_EXPLORER}/address/0xC3e0C4a5848c6b8754820286AF9805F6c4ca1Adf`],
    ],
  },
  {
    key: "cl",
    name: "Chainlink CRE",
    job: "Judges",
    color: "#375bd2",
    uses: ["CRE workflow in TypeScript (cre/judge/verdict)", "EVM log trigger on Arc (ClaimWindowClosed)", "EVM read on 0G Chain, HTTP fetch (record + Open-Meteo weather), report write to Arc"],
    how: [
      "Closing a claim window on Arc triggers the workflow. It finds the flight on 0G Chain for that airframe and time, and fetches the record.",
      "It re-hashes every record and checks it against the 0G Chain anchors, so it does not trust the server that handed the record over.",
      "It applies rules B1–B6 and writes BREACH or REVIEW to the escrow. The escrow only accepts reports from the CRE forwarder with the expected workflow ID and owner.",
    ],
    why: "Fault needs a judge that neither side controls and that always applies the same rules. A Chainlink workflow is that neutral, deterministic party; our own backend would just be one more interested party.",
    without: "Either the operator says “it responded as designed”, or the victim's lawyers fight it out. In Orlando the lawsuit names four defendants and had no ruling 8+ months later.",
    links: [["Verdict written to Arc (tx)", `${ARC_EXPLORER}/tx/0x687f8ceaac715f8f958fb794cbcc5ee4d3eb68867f0a7187346f3e4452f28e78`]],
  },
  {
    key: "arc",
    name: "Arc",
    job: "Pays",
    color: "#0e8ea0",
    uses: ["USDC on Arc Testnet (also the gas token)", "SkyProofEscrow, built in Arc Studio", "Bond, claim window, deposit, payout, insurer hold, timeouts"],
    how: [
      "The operator locks a USDC bond at least the payout cap; below it the drone is marked inactive.",
      "A victim opens a claim with a 1 USDC refundable deposit. After a 2-minute window, the judge's BREACH pays the cap from the bond and refunds the deposit, in one transaction.",
      "REVIEW holds the funds for the insurer (approve / reject, written reason sealed on 0G). Nothing decided in 30 days: the deposit goes back to the victim.",
    ],
    why: "Victims need dollars, not a volatile token, and they shouldn't need a second coin for gas. Arc settles in USDC and charges gas in USDC, so a claim is one token end to end.",
    without: "Payment depends on the operator's goodwill or a months-long insurance claim. Nothing forces money to move when the record proves a breach.",
    links: [
      ["SkyProofEscrow on Arc", `${ARC_EXPLORER}/address/0x10daa2dbded35f0056be1dbdbee908a12e4644d8`],
      ["Arc Studio project", "https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm"],
    ],
  },
];

export function Sponsors() {
  const [open, setOpen] = useState("0g");
  return (
    <section id="sponsors" className="scroll-mt-24">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">Built on</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">Three networks, three jobs. Take any one away and the promise breaks.</h2>
      </Reveal>
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {SPONSORS.map((s, i) => (
          <Reveal key={s.key} delay={i * 120}>
            <button onClick={() => setOpen(s.key)} className={cx("group w-full rounded-xl border bg-[#fffdf8] p-5 text-left transition-all duration-300", open === s.key ? "shadow-[0_14px_40px_rgba(20,22,26,0.10)]" : "border-[#e3ded3] hover:-translate-y-0.5")} style={{ borderColor: open === s.key ? s.color : undefined }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold tracking-tight text-[#15171a]">{s.name}</span>
                <span className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#f5f6ff]" style={{ borderColor: s.color, background: `${s.color}26` }}>
                  {s.job}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5">
                {s.uses.map((u) => (
                  <li key={u} className="flex gap-2 text-[13px] leading-snug text-[#45484e]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    {u}
                  </li>
                ))}
              </ul>
              <span className="mt-4 inline-block text-xs font-semibold" style={{ color: s.color }}>
                {open === s.key ? "Details below ↓" : "How, why, and without it →"}
              </span>
            </button>
          </Reveal>
        ))}
      </div>

      {SPONSORS.filter((s) => s.key === open).map((s) => (
        <div key={s.key} className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="boot rounded-xl border bg-[#fffdf8] p-6" style={{ borderColor: `${s.color}55` }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: s.color }}>
              How it&apos;s built
            </p>
            <ol className="mt-3 space-y-3">
              {s.how.map((h, k) => (
                <li key={k} className="boot flex gap-3 text-sm leading-relaxed text-[#33363b]" style={{ ["--d" as string]: `${120 + k * 140}ms` }}>
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold text-white" style={{ background: s.color }}>
                    {k + 1}
                  </span>
                  {h}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {s.links.map(([l, u]) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="font-mono text-[11px] underline underline-offset-2" style={{ color: s.color }}>
                  {l} ↗
                </a>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="boot rounded-xl border border-l-[3px] border-white/10 bg-[#0c0e2a]/70 p-5 text-[#f5f6ff] backdrop-blur-lg" style={{ borderLeftColor: s.color, ["--d" as string]: "200ms" }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: s.color === "#375bd2" ? "#8ea5f0" : s.color === "#0e8ea0" ? "#5fd0de" : "#b4a2ff" }}>Why {s.name}</p>
              <p className="mt-2 text-[15px] leading-relaxed">{s.why}</p>
            </div>
            <div className="boot rounded-xl border border-l-[3px] border-white/10 border-l-[#f87171] bg-[#0c0e2a]/70 p-5 backdrop-blur-lg" style={{ ["--d" as string]: "320ms" }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#fca5a5]">Without it</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#45484e]">{s.without}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
