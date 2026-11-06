"use client";
// The same incident, twice: how it plays out today, and with SkyProof. Rows reveal one by one.
import { Reveal } from "@/components/motion";

const ROWS: { stage: string; today: string; todayNote?: string; with: string; who: string; color: string }[] = [
  { stage: "The decision", today: "Made inside the drone's own software. Nothing outside records why.", with: "0G looks at the camera frame and answers ALLOW or DENY, with a request ID.", who: "0G", color: "#7c5cff" },
  { stage: "The record", today: "Kept by the operator, on its own devices and servers.", todayNote: "Barcarès: logs gone from all 3 devices", with: "Signed, chained, encrypted and sealed on 0G every 15 s, while the drone is still flying.", who: "0G", color: "#7c5cff" },
  { stage: "After the crash", today: "The operator reviews its own telemetry and decides what it says.", todayNote: "Tolleson: flying again in ~48 h on its own review", with: "The record already exists outside the operator. Deleting it is itself proof of tampering.", who: "0G", color: "#7c5cff" },
  { stage: "Who decides fault", today: "The operator (“responded as designed”), then lawyers and courts.", todayNote: "Orlando: 4 defendants, no ruling after 8+ months", with: "A Chainlink workflow checks the record against 0G Chain and applies six objective rules.", who: "Chainlink", color: "#375bd2" },
  { stage: "The victim", today: "Waits for an insurer or a court, with no access to the evidence.", with: "Paid from the operator's USDC bond in the same transaction as the verdict. Unclear cases go to a human with the same evidence.", who: "Arc", color: "#0e8ea0" },
  { stage: "Time to an answer", today: "Months to years.", with: "Minutes: a 2-minute claim window, then the judge.", who: "All three", color: "#15171a" },
];

export function WithWithout() {
  return (
    <section>
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#c2410c]">Without SkyProof vs with it</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#15171a] md:text-4xl">The same accident, two endings.</h2>
      </Reveal>
      <div className="mt-10 overflow-hidden rounded-xl border border-[#e3ded3]">
        <div className="grid grid-cols-[140px_1fr_1fr] bg-[#1a1d4a] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4f1ea] md:grid-cols-[180px_1fr_1fr]">
          <div className="px-4 py-3 text-[#8a8d93]">Stage</div>
          <div className="px-4 py-3 text-[#fca5a5]">Today</div>
          <div className="px-4 py-3 text-[#5eead4]">With SkyProof</div>
        </div>
        {ROWS.map((r, i) => (
          <div key={r.stage} className="grid grid-cols-[140px_1fr_1fr] border-t border-[#e3ded3] md:grid-cols-[180px_1fr_1fr]">
            <div className="bg-[#faf8f3] px-4 py-4 text-sm font-semibold text-[#15171a]">{r.stage}</div>
            <Reveal from="left" delay={i * 70} className="bg-[#fffdf8] px-4 py-4 text-sm leading-relaxed text-[#55595f]">
              {r.today}
              {r.todayNote && <div className="mt-1.5 font-mono text-[11px] text-[#b91c1c]">{r.todayNote}</div>}
            </Reveal>
            <Reveal delay={150 + i * 70} className="border-l border-[#e3ded3] bg-[#fffdf8] px-4 py-4 text-sm leading-relaxed text-[#15171a]">
              <span className="mr-2 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white" style={{ background: r.color }}>
                {r.who}
              </span>
              {r.with}
            </Reveal>
          </div>
        ))}
      </div>
      <Reveal delay={100}>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-[#8a8d93]">
          What SkyProof does not claim: it proves the record wasn&apos;t edited and who decided what. It cannot prove a sensor told the truth, and insurance stays mandatory in the EU, UK and India. The bond adds a fast first payout on objective breaches; courts still handle the rest, now with a record nobody could change.
        </p>
      </Reveal>
    </section>
  );
}
