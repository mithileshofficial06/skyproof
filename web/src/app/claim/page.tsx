"use client";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, defineChain, formatUnits, http, keccak256, parseAbi, stringToHex, toHex, type Address, type Hex } from "viem";
import escrowAbi from "@/lib/escrowAbi.json";
import { Badge, cx, HashLink, Panel, Stat } from "@/components/ui";
import { useIndex } from "@/lib/data";
import { ARC_EXPLORER, buildTimeline, type FlightFile, scenarioLabel } from "@/lib/flight";

const ESCROW = (process.env.NEXT_PUBLIC_ARC_ESCROW || "0x10daa2dbded35f0056be1dbdbee908a12e4644d8") as Address;
const USDC = "0x3600000000000000000000000000000000000000" as Address;
const arc = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "Arcscan", url: ARC_EXPLORER } },
  testnet: true,
});
const pub = createPublicClient({ chain: arc, transport: http() });
const erc20 = parseAbi(["function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)", "function balanceOf(address) view returns (uint256)"]);
const STATES = ["None", "Open", "WindowClosed", "Paid", "Held", "Resolved", "Expired"];
const AIRFRAME = stringToHex("SKY-001", { size: 32 });

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
declare global {
  interface Window {
    ethereum?: Eth;
  }
}

interface ClaimView {
  victim: Address;
  state: number;
  verdict: number;
  breachCode: Hex;
  cap: bigint;
  deposit: bigint;
  incidentId: bigint;
}

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
  const [info, setInfo] = useState<{ active: boolean; bond: bigint; cap: bigint; deposit: bigint; balance: bigint | null } | null>(null);

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (index && !flightId) setFlightId((index.find((f) => f.scenario === "geofence_breach") ?? index[0]).flightId);
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

  const wallet = () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    return createWalletClient({ chain: arc, transport: custom(window.ethereum), account: account! });
  };

  const connect = async () => {
    setError(null);
    try {
      if (!window.ethereum) throw new Error("Install MetaMask to file a claim.");
      const [a] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: toHex(arc.id) }] });
      } catch {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: toHex(arc.id), chainName: arc.name, nativeCurrency: arc.nativeCurrency, rpcUrls: arc.rpcUrls.default.http, blockExplorerUrls: [ARC_EXPLORER] }],
        });
      }
      setAccount(a);
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
    const evidence = keccak256(stringToHex(JSON.stringify({ flightId, what: "package struck a person", at: incident.pos })));
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
        <h1 className="text-2xl font-semibold tracking-tight text-white">File a claim</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">Hurt by a SkyProof drone? File a claim on Arc with a 1 USDC refundable deposit. After the 2-minute claim window, the Chainlink judge rebuilds the flight from 0G and, if an objective rule was broken, the operator&apos;s bond pays you automatically.</p>
      </div>

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
            <span className="font-mono text-slate-300">{account}</span>
            <Badge tone="arc">Arc Testnet</Badge>
          </div>
        ) : (
          <button onClick={connect} className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white">
            Connect MetaMask
          </button>
        )}
      </Panel>

      <Panel title="2 · Which flight?">
        <select value={flightId} onChange={(e) => setFlightId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-slate-100">
          {flightsWithDrop.map((f) => (
            <option key={f.flightId} value={f.flightId}>
              {scenarioLabel(f.scenario)} · {new Date(f.startedAt).toLocaleString()} · verdict preview {f.verdict}
            </option>
          ))}
        </select>
        {incident && (
          <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
            <div>Incident time: <span className="font-mono text-slate-200">{new Date(incident.time * 1000).toLocaleTimeString()}</span></div>
            <div>Where the package came down: <span className="font-mono text-slate-200">[{incident.pos.map((x) => x.toFixed(2)).join(", ")}]</span></div>
            <div>Evidence: <span className="text-slate-200">sealed flight record on 0G</span></div>
          </div>
        )}
      </Panel>

      <Panel title="3 · Open the claim">
        <button disabled={!account || !incident || !!busy || claimId !== null || !info?.active} onClick={fileClaim} className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy && claimId === null ? `${busy}…` : claimId !== null ? `Claim #${claimId} opened` : "Deposit 1 USDC and open the claim"}
        </button>
        {!info?.active && <p className="mt-2 text-xs text-amber-300">The drone is inactive: the operator&apos;s bond is below the payout cap.</p>}
      </Panel>

      <Panel title="4 · Claim window">
        {claimId === null ? (
          <p className="text-sm text-slate-500">Opens after the claim is filed. Other claims for the same incident can join during this window.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-mono text-4xl font-semibold tabular-nums text-white">{remaining !== null ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "…"}</div>
            <button disabled={!!busy || (remaining ?? 1) > 0 || state !== "Open"} onClick={closeWindow} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-40">
              {busy === "Close claim window" ? "Closing…" : state && state !== "Open" ? "Window closed" : "Close the window"}
            </button>
          </div>
        )}
      </Panel>

      <Panel title="5 · The Chainlink judge" right={state && <Badge tone={state === "Paid" ? "ok" : state === "Held" ? "warn" : "mute"}>{state}</Badge>}>
        {!closeTx ? (
          <p className="text-sm text-slate-500">Closing the window emits <span className="font-mono">ClaimWindowClosed</span>, the event that triggers the Chainlink CRE workflow.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Run the judge on this event (CRE simulation, broadcast to Arc):</p>
            <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 font-mono text-xs text-slate-300">{`cd cre/judge
cre workflow simulate verdict --non-interactive --trigger-index 0 \\
  --evm-tx-hash ${closeTx} --evm-event-index 0 --broadcast -T staging-settings`}</pre>
            {claim && claim.verdict > 0 && (
              <div className={cx("rounded-xl border p-4", claim.verdict === 1 ? "border-emerald-400/40 bg-emerald-500/10" : "border-amber-400/40 bg-amber-500/10")}>
                <div className="text-lg font-semibold text-white">{claim.verdict === 1 ? `BREACH · ${formatUnits(claim.cap, 6)} USDC paid to you` : "REVIEW · funds held for the insurer"}</div>
                <div className="mt-1 text-xs text-slate-400">{claim.verdict === 1 ? "Your 1 USDC deposit was refunded too." : "No objective rule was broken; the insurer decides with the verified evidence."}</div>
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
                <span className="text-slate-300">{t.label}</span>
                <HashLink hash={t.hash} href={`${ARC_EXPLORER}/tx/${t.hash}`} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
    </div>
  );
}
