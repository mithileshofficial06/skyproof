"use client";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, hexToString, keccak256, parseAbi, stringToHex, type Address, type Hex } from "viem";
import escrowAbi from "@/lib/escrowAbi.json";
import { Badge, cx, HashLink, Panel, Stat } from "@/components/ui";
import { useIndex } from "@/lib/data";
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
    fetch(`/data/flights/${flightId}.json`).then((r) => r.json()).then(setFlight);
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
        setError(`Evidence: ${(e as Error).message}`);
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#15171a]">File a claim</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#55595f]">Hurt by a SkyProof drone? File a claim on Arc with a 1 USDC refundable deposit. After the 2-minute claim window, the Chainlink judge rebuilds the flight from 0G and, if an objective rule was broken, the operator&apos;s bond pays you automatically.</p>
      </div>

      <Progress
        stage={claim && claim.verdict > 0 ? 4 : state && state !== "Open" ? 3 : claimId !== null ? 2 : sealed ? 1 : 0}
        result={claim && claim.verdict > 0 ? (claim.verdict === 1 ? "paid" : "held") : null}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Drone" value="SKY-001" sub={info ? (info.active ? "active (bond ≥ cap)" : "inactive") : "…"} tone={info?.active ? "good" : "warn"} />
        <Stat label="Operator bond" value={info ? formatUnits(info.bond, 6) : "…"} sub="USDC locked on Arc" />
        <Stat label="Payout cap" value={info ? formatUnits(info.cap, 6) : "…"} sub="USDC per claim" />
        <Stat label="Your USDC" value={info?.balance !== null && info?.balance !== undefined ? Number(formatUnits(info.balance, 6)).toFixed(2) : "—"} sub={account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "not connected"} />
      </div>

      <Panel title="1 · Connect your wallet">
        {account ? (
          <div className="flex items-center gap-2 text-sm">
            <Badge tone="ok">Connected</Badge>
            <span className="font-mono text-[#33363b]">{account}</span>
            <Badge tone="arc">Arc Testnet</Badge>
          </div>
        ) : (
          <button onClick={connect} className="rounded-md bg-[#15171a] px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] hover:bg-[#2b2e33]">
            Connect MetaMask
          </button>
        )}
      </Panel>

      <Panel title="2 · Which flight?">
        <select value={flightId} onChange={(e) => setFlightId(e.target.value)} className="w-full rounded-md border border-[#e3ded3] bg-[#f6f3ec] px-3 py-2.5 text-sm text-[#15171a]">
          {flightsWithDrop.map((f) => (
            <option key={f.flightId} value={f.flightId}>
              {scenarioLabel(f.scenario)} · {new Date(f.startedAt).toLocaleString()} · verdict preview {f.verdict}
            </option>
          ))}
        </select>
        {incident && (
          <div className="mt-3 grid gap-2 text-xs text-[#55595f] sm:grid-cols-3">
            <div>Incident time: <span className="font-mono text-[#15171a]">{new Date(incident.time * 1000).toLocaleTimeString()}</span></div>
            <div>Where the package came down: <span className="font-mono text-[#15171a]">[{incident.pos.map((x) => x.toFixed(2)).join(", ")}]</span></div>
            <div>Evidence: <span className="text-[#15171a]">sealed flight record on 0G</span></div>
          </div>
        )}
      </Panel>

      <Panel title="3 · Your evidence" right={<Badge tone="zg">sealed on 0G Storage</Badge>}>
        <p className="text-xs text-[#55595f]">What happened to you? Add photos (injury, damage, the package) or a document. They are sealed on 0G Storage and their fingerprint goes into your claim on Arc, so nobody can change them later. An insurer reads them if the judge sends the claim to review.</p>
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} disabled={claimId !== null} rows={3} maxLength={2000} placeholder="e.g. The package hit my shoulder at the drop zone around 4:12 AM. Bruised, saw a doctor." className="mt-3 w-full rounded-md border border-[#e3ded3] bg-[#f6f3ec] px-3 py-2 text-sm text-[#15171a] disabled:opacity-60" />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#55595f]">
          <input type="file" multiple accept="image/*,application/pdf" disabled={claimId !== null} onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))} className="text-xs" />
          <span>{files.length ? `${files.length} file(s) · photos are resized to 1280 px` : "up to 4 files (optional)"}</span>
        </div>
        {sealed && (
          <div className="mt-3 space-y-0.5 font-mono text-[11px] text-[#55595f]">
            <div>fingerprint <span className="text-[#15171a]">{sealed.evidenceHash}</span></div>
            <div>0G root <span className="text-[#15171a]">{sealed.rootHash}</span></div>
            <div>
              0G tx{" "}
              <a href={`${ZG_EXPLORER}/tx/${sealed.storageTx}`} target="_blank" rel="noreferrer" className="text-[#3b2fa8] underline">
                {sealed.storageTx}
              </a>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="4 · Open the claim">
        <button disabled={!account || !incident || !!busy || claimId !== null || !info?.active} onClick={fileClaim} className="rounded-md bg-[#15171a] px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] hover:bg-[#2b2e33] disabled:opacity-40">
          {busy && claimId === null ? `${busy}…` : claimId !== null ? `Claim #${claimId} opened` : "Deposit 1 USDC and open the claim"}
        </button>
        {!info?.active && <p className="mt-2 text-xs text-[#b45309]">The drone is inactive: the operator&apos;s bond is below the payout cap.</p>}
      </Panel>

      <Panel title="5 · Claim window">
        {claimId === null ? (
          <p className="text-sm text-[#8a8d93]">Opens after the claim is filed. Other claims for the same incident can join during this window.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-mono text-4xl font-semibold tabular-nums text-[#15171a]">{remaining !== null ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "…"}</div>
            <button disabled={!!busy || (remaining ?? 1) > 0 || state !== "Open"} onClick={closeWindow} className="rounded-md border border-[#cfc8ba] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#15171a] disabled:opacity-40">
              {busy === "Close claim window" ? "Closing…" : state && state !== "Open" ? "Window closed" : "Close the window"}
            </button>
          </div>
        )}
      </Panel>

      <Panel title="6 · The Chainlink judge" right={state && <Badge tone={state === "Paid" ? "ok" : state === "Held" ? "warn" : "mute"}>{state}</Badge>}>
        {!closeTx ? (
          <p className="text-sm text-[#8a8d93]">Closing the window emits <span className="font-mono">ClaimWindowClosed</span>, the event that triggers the Chainlink CRE workflow.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#33363b]">Run the judge on this event (CRE simulation, broadcast to Arc):</p>
            <pre className="overflow-x-auto rounded-md bg-[#f6f3ec] p-4 font-mono text-xs text-[#33363b]">{`cd cre/judge
cre workflow simulate verdict --non-interactive --trigger-index 0 \\
  --evm-tx-hash ${closeTx} --evm-event-index 0 --broadcast -T staging-settings`}</pre>
            <JudgeRules verdict={claim?.verdict ?? 0} code={claim?.breachCode} />
            {claim && claim.verdict === 1 && <MoneyFlow amount={formatUnits(claim.cap, 6)} />}
            {claim && claim.verdict > 0 && (
              <div className={cx("rounded-md border p-4", claim.verdict === 1 ? "border-[#b7dcd6] bg-[#ecf7f5]" : "border-[#efd3a6] bg-[#fdf6ea]")}>
                <div className="text-lg font-semibold text-[#15171a]">{claim.verdict === 1 ? `BREACH · ${formatUnits(claim.cap, 6)} USDC paid to you` : "REVIEW · funds held for the insurer"}</div>
                <div className="mt-1 text-xs text-[#55595f]">{claim.verdict === 1 ? "Your 1 USDC deposit was refunded too." : "No objective rule was broken; the insurer decides with the verified evidence."}</div>
                {claim.verdict !== 1 && (
                  <a href="/insurer" className="mt-2 inline-block text-xs font-semibold text-[#3b2fa8] underline">
                    See it on the insurer desk →
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>

      {txs.length > 0 && (
        <Panel title="Your transactions on Arc">
          <ul className="space-y-1.5 text-sm">
            {txs.map((t) => (
              <li key={t.hash} className="flex items-center justify-between">
                <span className="text-[#33363b]">{t.label}</span>
                <HashLink hash={t.hash} href={`${ARC_EXPLORER}/tx/${t.hash}`} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {error && <p className="rounded-md border border-[#f0c4c4] bg-[#fdf0f0] px-4 py-3 text-sm text-[#9b1c1c]">{error}</p>}
    </div>
  );
}

const STAGES = ["Evidence", "Claim on Arc", "Claim window", "Chainlink judge", "Result"];
function Progress({ stage, result }: { stage: number; result: "paid" | "held" | null }) {
  return (
    <div className="flex items-center gap-2">
      {STAGES.map((l, i) => {
        const done = i < stage || (i === 4 && !!result);
        const now = i === stage && !result;
        const color = i === 4 && result ? (result === "paid" ? "#10b981" : "#b45309") : i <= 1 ? "#7c5cff" : i === 3 ? "#375bd2" : "#0e8ea0";
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e3ded3]">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: done ? "100%" : now ? "45%" : "0%", background: color }} />
              </div>
              <span className={cx("truncate text-[11px] font-medium", done || now ? "text-[#15171a]" : "text-[#8a8d93]")}>
                {i === 4 && result ? (result === "paid" ? "Paid ✓" : "Held for insurer") : l}
              </span>
            </div>
          </div>
        );
      })}
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
