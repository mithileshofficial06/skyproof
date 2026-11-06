"use client";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, hexToString, keccak256, parseAbi, stringToHex, type Address, type Hex } from "viem";
import escrowAbi from "@/lib/escrowAbi.json";
import Link from "next/link";
import { Chip, Details, RULE_WORDS, Timeline } from "@/components/simple";
import { cx, HashLink, Panel, Stat } from "@/components/ui";
import { useIndex } from "@/lib/data";
import { flightFile } from "@/lib/siteData";
import { AIRFRAME, arc, arcWallet, type ClaimView, connectArc, ESCROW, EVIDENCE_URL, packFile, pub, STATES, USDC } from "@/lib/arc";
import { ARC_EXPLORER, buildTimeline, type FlightFile, scenarioLabel, ZG_EXPLORER } from "@/lib/flight";

const erc20 = parseAbi(["function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)", "function balanceOf(address) view returns (uint256)"]);

export default function Claim() {
  const { data: index } = useIndex();
  const [account, setAccount] = useState<Address | null>(null);
  const [flightId, setFlightId] = useState<string>("");
  const [flight, setFlight] = useState<FlightFile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<bigint | null>(null);
  const [claim, setClaim] = useState<ClaimView | null>(null);
  const [windowEnd, setWindowEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [txs, setTxs] = useState<{ label: string; hash: Hex }[]>([]);
  const [statement, setStatement] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sealed, setSealed] = useState<{ evidenceHash: Hex; rootHash: string; storageTx: string } | null>(null);
  const [info, setInfo] = useState<{ active: boolean; bond: bigint; cap: bigint; deposit: bigint; balance: bigint | null } | null>(null);

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("flight");
    if (index && !flightId) setFlightId(want && index.some((f) => f.flightId === want) ? want : (index.find((f) => f.scenario === "geofence_breach") ?? index[0]).flightId);
  }, [index, flightId]);
  useEffect(() => {
    if (!flightId) return;
    flightFile(`${flightId}.json`).then((r) => r.json()).then(setFlight);
  }, [flightId]);

  const refreshInfo = async () => {
    const [af, deposit] = await Promise.all([
      pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "airframes", args: [AIRFRAME] }) as Promise<[bigint, bigint, Address, bigint]>,
      pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "claimDeposit" }) as Promise<bigint>,
    ]);
    const active = (await pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "isActive", args: [AIRFRAME] })) as boolean;
    const balance = account ? await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account] }) : null;
    setInfo({ active, bond: af[1], cap: af[0], deposit, balance });
  };
  useEffect(() => {
    refreshInfo().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  // poll the claim until the judge's verdict lands
  useEffect(() => {
    if (claimId === null) return;
    const read = async () => {
      const c = (await pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "claims", args: [claimId] })) as ClaimView;
      setClaim(c);
    };
    read();
    const i = setInterval(read, 4000);
    return () => clearInterval(i);
  }, [claimId]);

  const incident = useMemo(() => {
    if (!flight) return null;
    const tl = buildTimeline(flight);
    const drop = tl.events.find((e) => e.kind === "action" && /DROP/.test(e.title)) ?? tl.events.find((e) => e.kind === "action");
    const t = drop?.t ?? tl.duration / 2;
    const s = tl.samples.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a), tl.samples[0]);
    const time = Math.min(flight.chain.closedAt, flight.chain.openedAt + Math.max(1, Math.round(t)));
    return { time, pos: s.pos };
  }, [flight]);

  const wallet = () => arcWallet(account!);

  const connect = async () => {
    setError(null);
    try {
      setAccount(await connectArc());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const step = async (label: string, fn: () => Promise<Hex>) => {
    setBusy(label);
    setError(null);
    try {
      const hash = await fn();
      setTxs((x) => [...x, { label, hash }]);
      const r = await pub.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error(`${label} reverted`);
      return r;
    } catch (e) {
      setError((e as Error).message.split("\n")[0]);
      throw e;
    } finally {
      setBusy(null);
    }
  };

  const fileClaim = async () => {
    if (!incident || !account || !info) return;
    const w = wallet();
    const allowance = await pub.readContract({ address: USDC, abi: erc20, functionName: "allowance", args: [account, ESCROW] });
    if (allowance < info.deposit) await step("Approve 1 USDC deposit", () => w.writeContract({ address: USDC, abi: erc20, functionName: "approve", args: [ESCROW, info.deposit], chain: arc, account }));
    let evidence = keccak256(stringToHex(JSON.stringify({ flightId, what: "package struck a person", at: incident.pos })));
    if (statement.trim()) {
      // seal the victim's statement + photos on 0G Storage; the claim on Arc carries their fingerprint
      setBusy("Sealing your evidence on 0G Storage");
      setError(null);
      try {
        const packed = await Promise.all(files.map(packFile));
        const r = await fetch(`${EVIDENCE_URL}/claim-evidence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flightId, statement, files: packed }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "evidence upload failed");
        setSealed(j);
        evidence = j.evidenceHash;
      } catch (e) {
        const msg = (e as Error).message;
        setError(/fetch|network/i.test(msg) ? "The evidence service is offline, so photos can't be sealed right now. Clear the statement to file the claim without attachments." : `Evidence: ${msg}`);
        setBusy(null);
        return;
      }
      setBusy(null);
    }
    const before = (await pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "nextClaimId" })) as bigint;
    await step("Open claim on Arc", () =>
      w.writeContract({ address: ESCROW, abi: escrowAbi, functionName: "openClaim", args: [AIRFRAME, BigInt(incident.time), BigInt(Math.round(incident.pos[0] * 1e6)), BigInt(Math.round(incident.pos[1] * 1e6)), evidence], chain: arc, account }),
    );
    const inc = (await pub.readContract({ address: ESCROW, abi: escrowAbi, functionName: "currentIncident", args: [AIRFRAME] })) as { windowEnd: bigint };
    setClaimId(before);
    setWindowEnd(Number(inc.windowEnd));
    refreshInfo();
  };

  const closeWindow = async () => {
    if (claimId === null || !account) return;
    await step("Close claim window", () => wallet().writeContract({ address: ESCROW, abi: escrowAbi, functionName: "closeClaimWindow", args: [claimId], chain: arc, account }));
  };

  const closeTx = txs.find((t) => t.label === "Close claim window")?.hash;
  const state = claim ? STATES[claim.state] : null;
  const remaining = windowEnd ? Math.max(0, windowEnd - now) : null;
  const flightsWithDrop = index?.filter((f) => f.scenario !== "network_down") ?? [];

  const verdict = claim?.verdict ?? 0;
  const brokenRule = claim && verdict === 1 ? hexToString(claim.breachCode, { size: 32 }).replace(/\0/g, "") : "";
  const busyText = (b: string) =>
    b.startsWith("Approve") ? "Please confirm the 1 USDC deposit in your wallet…" : b.startsWith("Sealing") ? "Saving your description and photos safely…" : b.startsWith("Open") ? "Sending your report…" : b.startsWith("Close") ? "Starting the automatic check…" : `${b}…`;
  const fmtTime = (t: number) => new Date(t * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#15171a]">Report a problem</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#55595f]">
          Hurt, or something damaged, by a delivery drone? Tell us what happened. We check the drone&apos;s sealed black box. If it broke a safety rule, you are paid automatically. If not, an insurer looks at your case and replies with a reason.
        </p>
      </div>

      {claimId === null && (
        <Details title="How to test this (for judges)">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[#33363b]">
            <li>Install MetaMask. &ldquo;Connect my wallet&rdquo; adds the <b>Arc Testnet</b> network for you.</li>
            <li>
              Get free test USDC for Arc Testnet from the{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="font-semibold text-[#15171a] underline">
                Circle faucet
              </a>
              . On Arc, USDC also pays the network fee, so about 2 USDC is plenty.
            </li>
            <li>
              Pick a delivery. <b>&ldquo;Cheating operator&rdquo;</b> broke a safety rule, so it is paid automatically. A delivery that followed every rule goes to an insurer instead.
            </li>
            <li>Describe what happened, optionally add a photo, and send. After the 2-minute waiting period the automatic Chainlink check starts by itself; the result appears here within a minute or two.</li>
            <li>
              Follow it any time on{" "}
              <Link href="/track" className="font-semibold text-[#15171a] underline">
                Track my claim
              </Link>
              .
            </li>
          </ol>
        </Details>
      )}

      {claimId === null ? (
        <>
          <Panel title="Step 1 · What happened?">
            <div className="space-y-5">
              <div>
                <label htmlFor="when" className="block text-sm font-semibold text-[#15171a]">When did it happen?</label>
                <p className="mt-0.5 text-xs text-[#8a8d93]">Demo: pick one of the recorded deliveries. In real use you would type the date, time and address.</p>
                <select id="when" value={flightId} onChange={(e) => setFlightId(e.target.value)} className="mt-2 w-full rounded-md border border-[#e3ded3] bg-[#f6f3ec] px-3 py-3 text-[15px] text-[#15171a]">
                  {flightsWithDrop.map((f) => (
                    <option key={f.flightId} value={f.flightId}>
                      Delivery on {new Date(f.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} (demo: {scenarioLabel(f.scenario).toLowerCase()})
                    </option>
                  ))}
                </select>
                {incident && (
                  <p className="mt-2 text-sm text-[#55595f]">
                    Time of the incident: <span className="font-semibold text-[#15171a]">{fmtTime(incident.time)}</span>, at the drop zone.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="what" className="block text-sm font-semibold text-[#15171a]">Tell us what happened</label>
                <textarea id="what" value={statement} onChange={(e) => setStatement(e.target.value)} rows={4} maxLength={2000} placeholder="e.g. The drone dropped its package on my car around 4:12 PM. The windscreen is cracked." className="mt-2 w-full rounded-md border border-[#e3ded3] bg-[#f6f3ec] px-3 py-2.5 text-[15px] text-[#15171a]" />
              </div>
              <div>
                <label htmlFor="photos" className="block text-sm font-semibold text-[#15171a]">
                  Add photos <span className="font-normal text-[#8a8d93]">(optional, up to 4)</span>
                </label>
                <input id="photos" type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))} className="mt-2 block text-sm text-[#55595f] file:mr-3 file:rounded-full file:border-0 file:bg-[#15171a] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#f4f1ea]" />
                {files.length > 0 && <p className="mt-1 text-xs text-[#55595f]">{files.length} file(s) added. They are stored safely and cannot be changed later.</p>}
              </div>
            </div>
          </Panel>

          <Panel title="Step 2 · Where should we send the money?">
            {account ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Chip tone="ok">Wallet connected</Chip>
                <span className="font-mono text-[#33363b]">
                  {account.slice(0, 6)}…{account.slice(-4)}
                </span>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-[#55595f]">Payouts are sent in USDC (a digital dollar) to your wallet.</p>
                <button onClick={connect} className="rounded-full bg-[#15171a] px-6 py-3 text-[15px] font-semibold text-[#f4f1ea] hover:bg-[#2b2e33]">
                  Connect my wallet
                </button>
              </>
            )}
          </Panel>

          <Panel title="Step 3 · Send your report">
            <p className="mb-3 text-sm text-[#55595f]">A small refundable deposit of 1 USDC stops fake reports. You get it back when you are paid.</p>
            <button disabled={!account || !incident || !!busy || !info?.active} onClick={fileClaim} className="w-full rounded-full bg-[#15171a] px-6 py-3.5 text-base font-semibold text-[#f4f1ea] hover:bg-[#2b2e33] disabled:opacity-40 sm:w-auto">
              {busy ? busyText(busy) : "Send my report"}
            </button>
            {!account && <p className="mt-2 text-sm text-[#8a8d93]">Connect your wallet in step 2 first.</p>}
            {info && !info.active && <p className="mt-2 text-sm text-[#b45309]">This drone cannot take new reports right now: its operator&apos;s insurance money is too low.</p>}
          </Panel>
        </>
      ) : (
        <Panel title={`Your claim #${claimId}`} right={<Chip tone={verdict === 1 ? "ok" : verdict === 2 ? "warn" : "wait"}>{verdict === 1 ? "Paid" : verdict === 2 ? "With an insurer" : "In progress"}</Chip>}>
          <Timeline
            steps={[
              {
                title: "Report received",
                state: "done",
                detail: (
                  <>
                    Your claim number is <b>#{String(claimId)}</b>. You can follow it any time on{" "}
                    <Link href={`/track?id=${claimId}`} className="font-semibold text-[#15171a] underline">
                      Track my claim
                    </Link>
                    .
                  </>
                ),
              },
              {
                title: "Short waiting period",
                state: state && state !== "Open" ? "done" : "now",
                detail:
                  state && state !== "Open" ? (
                    "Finished."
                  ) : (
                    <div className="space-y-2">
                      <p>Anyone else hurt by the same drone can join in this time.</p>
                      <div className="font-mono text-3xl font-semibold tabular-nums text-[#15171a]">{remaining !== null ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "…"}</div>
                      <button disabled={!!busy || (remaining ?? 1) > 0 || state !== "Open"} onClick={closeWindow} className="rounded-full bg-[#15171a] px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] disabled:opacity-40">
                        {busy ? busyText(busy) : (remaining ?? 1) > 0 ? "Please wait…" : "Start the automatic check"}
                      </button>
                    </div>
                  ),
              },
              {
                title: "Automatic check of the drone's black box",
                state: verdict > 0 ? "done" : closeTx || (state && state !== "Open") ? "now" : "todo",
                detail: verdict > 0 ? "Done. The drone's record is genuine and was checked against the safety rules." : closeTx || (state && state !== "Open") ? "Chainlink is checking the drone's sealed record against the safety rules. This usually takes a minute or two." : "Starts by itself after the waiting period.",
              },
              {
                title: verdict === 1 ? "Approved" : verdict === 2 ? "Sent to an insurer" : "Decision",
                state: verdict === 1 ? "done" : verdict === 2 ? "warn" : "todo",
                detail:
                  verdict === 1 ? (
                    <>
                      The drone broke a safety rule: <b>{RULE_WORDS[brokenRule] ?? "a safety rule"}</b>. No one needs to approve this.
                    </>
                  ) : verdict === 2 ? (
                    <>
                      The drone&apos;s record shows no rule was broken, so a person will look at your description and photos and decide. Their answer and reason will appear on{" "}
                      <Link href={`/track?id=${claimId}`} className="font-semibold text-[#15171a] underline">
                        Track my claim
                      </Link>
                      .
                    </>
                  ) : undefined,
              },
              {
                title: "Paid",
                state: verdict === 1 ? "done" : "todo",
                detail:
                  verdict === 1 && claim ? (
                    <div className="space-y-3">
                      <p>{formatUnits(claim.cap, 6)} USDC was sent to your wallet, and your 1 USDC deposit was returned.</p>
                      <MoneyFlow amount={formatUnits(claim.cap, 6)} />
                    </div>
                  ) : undefined,
              },
            ]}
          />
        </Panel>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-[#f0c4c4] bg-[#fdf0f0] px-4 py-3 text-sm text-[#9b1c1c]">
          Something went wrong: {error}
        </p>
      )}

      <Details title="Technical details">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Drone" value="SKY-001" sub={info ? (info.active ? "active (bond ≥ cap)" : "inactive") : "…"} tone={info?.active ? "good" : "warn"} />
          <Stat label="Operator bond" value={info ? formatUnits(info.bond, 6) : "…"} sub="USDC locked on Arc" />
          <Stat label="Payout cap" value={info ? formatUnits(info.cap, 6) : "…"} sub="USDC per claim" />
          <Stat label="Your USDC" value={info?.balance !== null && info?.balance !== undefined ? Number(formatUnits(info.balance, 6)).toFixed(2) : "—"} sub={account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "not connected"} />
        </div>
        {incident && (
          <p className="text-xs text-[#55595f]">
            Incident sent to Arc: time {incident.time}, place [{incident.pos.map((x) => x.toFixed(2)).join(", ")}] · flight {flightId}
          </p>
        )}
        {closeTx && (
          <div className="space-y-2">
            <p className="text-sm text-[#33363b]">
              The waiting period closed on Arc and emitted <span className="font-mono">ClaimWindowClosed</span>. The CRE auto-runner (<span className="font-mono">pnpm cre-runner</span>) picks this event up and runs the Chainlink CRE judge on it (simulation, broadcast to Arc). The same command by hand:
            </p>
            <pre className="overflow-x-auto rounded-md bg-[#f6f3ec] p-4 font-mono text-xs text-[#33363b]">{`cd cre/judge
cre workflow simulate verdict --non-interactive --trigger-index 0 \\
  --evm-tx-hash ${closeTx} --evm-event-index 0 --broadcast -T staging-settings`}</pre>
          </div>
        )}
        {claimId !== null && <JudgeRules verdict={verdict} code={claim?.breachCode} />}
        {sealed && (
          <div className="space-y-0.5 font-mono text-[11px] text-[#55595f]">
            <div>
              evidence fingerprint <span className="text-[#15171a]">{sealed.evidenceHash}</span>
            </div>
            <div>
              0G root <span className="text-[#15171a]">{sealed.rootHash}</span>
            </div>
            <div>
              0G tx{" "}
              <a href={`${ZG_EXPLORER}/tx/${sealed.storageTx}`} target="_blank" rel="noreferrer" className="text-[#3b2fa8] underline">
                {sealed.storageTx}
              </a>
            </div>
          </div>
        )}
        {txs.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {txs.map((t) => (
              <li key={t.hash} className="flex items-center justify-between">
                <span className="text-[#33363b]">{t.label}</span>
                <HashLink hash={t.hash} href={`${ARC_EXPLORER}/tx/${t.hash}`} />
              </li>
            ))}
          </ul>
        )}
      </Details>
    </div>
  );
}


const RULES = [
  ["B1_GEOFENCE", "Stayed in the permitted area"],
  ["B2_ALTITUDE", "Stayed under the height ceiling"],
  ["B3_UNAPPROVED_ACTION", "Every action had 0G's approval"],
  ["B4_OVERRIDE_ON_DENY", "Never overrode a DENY"],
  ["B5_RECORD_BROKEN", "No gaps or edits in the record"],
  ["B6_UNSAFE_WIND_LAUNCH", "No take-off in unsafe wind"],
];
/** The judge's six rules: a blue scan while it runs, then pass / fail. */
function JudgeRules({ verdict, code }: { verdict: number; code?: Hex }) {
  const broken = code ? hexToString(code, { size: 32 }).replace(/\0/g, "") : "";
  return (
    <div className="relative overflow-hidden rounded-md border border-[#c9d6ef] bg-[#f5f8ff] p-3">
      {verdict === 0 && <span className="sweep pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-[#375bd2]/20 to-transparent" />}
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#375bd2]">
        <span>Chainlink CRE · rules</span>
        <span>{verdict === 0 ? <span className="blink">waiting for the judge…</span> : verdict === 1 ? "breach found" : "no rule broken"}</span>
      </div>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {RULES.map(([k, l], i) => {
          const bad = verdict === 1 && broken === k;
          const ok = verdict > 0 && !bad;
          return (
            <div key={k} className={cx("flex items-center gap-2 py-0.5 text-[12px]", verdict > 0 && "boot")} style={{ ["--d" as string]: `${i * 120}ms` }}>
              <span className={cx("grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white", bad ? "bg-[#b91c1c]" : ok ? (verdict === 1 ? "bg-[#94a3b8]" : "bg-[#0f766e]") : "bg-[#cbd5e1]")}>{bad ? "✗" : ok ? (verdict === 1 ? "·" : "✓") : ""}</span>
              <span className={cx(bad ? "font-semibold text-[#9b1c1c]" : "text-[#33363b]")}>
                <span className="mr-1 font-mono text-[10px] text-[#8a8d93]">{k.slice(0, 2)}</span>
                {l}
              </span>
            </div>
          );
        })}
      </div>
      {verdict === 1 && <p className="mt-1.5 text-[11px] text-[#55595f]">The judge reports the first rule it found broken; the full list is in the Chainlink workflow log.</p>}
    </div>
  );
}

/** USDC moving from the operator's bond to the victim on Arc. */
function MoneyFlow({ amount }: { amount: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#bfe0e8] bg-[#eef8fa] p-3">
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[#155e75]">Operator bond</div>
        <div className="font-mono text-sm font-semibold text-[#15171a]">−{amount} USDC</div>
      </div>
      <div className="relative h-8 flex-1">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#bfe0e8]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="coin-lr absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#2775ca] font-mono text-[9px] font-bold text-white shadow" style={{ ["--d" as string]: `${i * 200}ms` }}>
            $
          </span>
        ))}
      </div>
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[#0f5f59]">You</div>
        <div className="font-mono text-sm font-semibold text-[#0f766e]">+{amount} USDC</div>
      </div>
    </div>
  );
}
