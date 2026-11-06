"use client";
// Track my claim: the victim types a claim number and sees, in plain words, where it is and why.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatUnits, hexToString } from "viem";
import escrowAbi from "@/lib/escrowAbi.json";
import { Chip, Details, RULE_WORDS, type Step, Timeline } from "@/components/simple";
import { HashLink, Panel } from "@/components/ui";
import { type ClaimView, ESCROW, EVIDENCE_URL, pub, STATES } from "@/lib/arc";
import { ARC_EXPLORER, ZG_EXPLORER } from "@/lib/flight";

interface Note {
  approve: boolean;
  reason: string;
  decisionTx: string;
  storageTx: string;
}

const fmt = (t: bigint | number) => new Date(Number(t) * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export default function Track() {
  const [input, setInput] = useState("");
  const [id, setId] = useState<number | null>(null);
  const [claim, setClaim] = useState<ClaimView | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("id");
    if (q && /^\d+$/.test(q)) {
      setInput(q);
      setId(Number(q));
    }
  }, []);

  const load = useCallback(async (n: number) => {
    const c = (await pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "claims", args: [BigInt(n)] })) as ClaimView;
    if (STATES[c.state] === "None") throw new Error(`We could not find claim #${n}. Check the number and try again.`);
    setClaim(c);
    if (STATES[c.state] === "Resolved")
      fetch(`${EVIDENCE_URL}/decision/${n}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setNote)
        .catch(() => {});
  }, []);

  useEffect(() => {
    if (id === null) return;
    setLoading(true);
    setError(null);
    setClaim(null);
    setNote(null);
    load(id)
      .catch((e) => setError((e as Error).message.split("\n")[0]))
      .finally(() => setLoading(false));
    const i = setInterval(() => load(id).catch(() => {}), 8000);
    return () => clearInterval(i);
  }, [id, load]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(input.trim())) return setError("Please type the claim number, for example 5.");
    const n = Number(input.trim());
    window.history.replaceState(null, "", `/track?id=${n}`);
    setId(n);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#15171a]">Track my claim</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#55595f]">Type the claim number you got when you reported the problem.</p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-3">
        <label htmlFor="claimno" className="sr-only">Claim number</label>
        <input id="claimno" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Claim number, e.g. 5" className="min-w-0 flex-1 rounded-full border border-[#e3ded3] bg-[#f6f3ec] px-5 py-3 text-base text-[#15171a]" />
        <button type="submit" className="rounded-full bg-[#15171a] px-6 py-3 text-base font-semibold text-[#f4f1ea] hover:bg-[#2b2e33]">
          Show my claim
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-md border border-[#f0c4c4] bg-[#fdf0f0] px-4 py-3 text-sm text-[#9b1c1c]">
          {error}
        </p>
      )}
      {loading && !claim && <p className="text-sm text-[#8a8d93]">Looking up your claim…</p>}

      {claim && id !== null && <ClaimStatus id={id} c={claim} note={note} />}

      {!id && (
        <p className="text-sm text-[#55595f]">
          Don&apos;t have a claim yet?{" "}
          <Link href="/claim" className="font-semibold text-[#15171a] underline">
            Report a problem
          </Link>
        </p>
      )}
    </div>
  );
}

function ClaimStatus({ id, c, note }: { id: number; c: ClaimView; note: Note | null }) {
  const st = STATES[c.state];
  const rule = hexToString(c.breachCode, { size: 32 }).replace(/\0/g, "");
  const cap = formatUnits(c.cap, 6);
  const daysLeft = Math.max(0, (Number(c.heldDeadline) - Date.now() / 1000) / 86400);
  const decidedByHuman = st === "Resolved";

  const decision: Step =
    c.verdict === 1
      ? { title: "Approved automatically", state: "done", detail: <>The drone broke a safety rule: <b>{RULE_WORDS[rule] ?? "a safety rule"}</b>. No one needed to approve it.</> }
      : st === "Held"
        ? { title: "With an insurer", state: "warn", detail: <>The drone&apos;s record shows no rule was broken, so a person is looking at your case. They have <b>{daysLeft.toFixed(0)} days</b> left to decide. If they don&apos;t, your deposit is returned.</> }
        : decidedByHuman
          ? note
            ? { title: note.approve ? "Approved by the insurer" : "Rejected by the insurer", state: note.approve ? "done" : "bad", detail: <blockquote className="mt-1 rounded-md border-l-4 border-[#cfc8ba] bg-[#faf8f3] px-3 py-2 text-[15px] text-[#15171a]">&ldquo;{note.reason}&rdquo;</blockquote> }
            : { title: "Decided by the insurer", state: "done", detail: "The insurer has made a decision. Loading their reason…" }
          : st === "Expired"
            ? { title: "No decision in time", state: "warn", detail: "The insurer did not decide within 30 days, so your deposit was returned." }
            : { title: "Decision", state: "todo" };

  const paid = c.verdict === 1 || (decidedByHuman && note?.approve);
  const steps: Step[] = [
    { title: "Report received", state: "done", detail: <>Incident on {fmt(c.incidentTime)}.</> },
    { title: "Short waiting period", state: st === "Open" ? "now" : "done", detail: st === "Open" ? "Anyone else hurt by the same drone can join. Then the automatic check starts." : undefined },
    {
      title: "Automatic check of the drone's black box",
      state: c.verdict > 0 ? "done" : st === "WindowClosed" ? "now" : "todo",
      detail: c.verdict > 0 ? "Done. The drone's sealed record was checked against the safety rules." : st === "WindowClosed" ? "Checking the drone's sealed record…" : undefined,
    },
    decision,
    {
      title: paid ? "Paid" : decidedByHuman && note && !note.approve ? "Not paid" : "Payment",
      state: paid ? "done" : decidedByHuman && note && !note.approve ? "bad" : "todo",
      detail: paid ? <>{cap} USDC was sent to your wallet, and your 1 USDC deposit was returned.</> : decidedByHuman && note && !note.approve ? "Your claim was rejected for the reason above." : undefined,
    },
  ];

  const chip = paid ? <Chip tone="ok">Paid</Chip> : st === "Held" ? <Chip tone="warn">With an insurer</Chip> : decidedByHuman && note && !note.approve ? <Chip tone="bad">Rejected</Chip> : <Chip tone="wait">In progress</Chip>;

  return (
    <>
      <Panel title={`Claim #${id}`} right={chip}>
        <Timeline steps={steps} />
      </Panel>
      <Details>
        <ul className="space-y-1.5 text-sm text-[#33363b]">
          <li>Status on Arc: <span className="font-mono">{st}</span> · judge verdict {c.verdict === 1 ? "BREACH" : c.verdict === 2 ? "REVIEW" : "pending"}{rule && rule !== "NONE" ? ` (${rule})` : ""}</li>
          <li>Payout cap {cap} USDC · deposit {formatUnits(c.deposit, 6)} USDC</li>
          <li>Victim wallet <span className="font-mono">{c.victim}</span></li>
          <li>Evidence fingerprint <span className="break-all font-mono text-xs">{c.evidenceHash}</span></li>
          {note && (
            <li className="flex flex-wrap items-center gap-2">
              Insurer decision on Arc <HashLink hash={note.decisionTx} href={`${ARC_EXPLORER}/tx/${note.decisionTx}`} /> · reason sealed on 0G <HashLink hash={note.storageTx} href={`${ZG_EXPLORER}/tx/${note.storageTx}`} />
            </li>
          )}
        </ul>
      </Details>
    </>
  );
}
