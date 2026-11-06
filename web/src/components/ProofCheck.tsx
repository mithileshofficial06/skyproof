"use client";
// Proof, checked in the visitor's browser: re-hash every record, follow the chain links, recover the
// signer, and compare against the anchors read live from 0G Chain. Then let the visitor try to cheat.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, defineChain, http, keccak256, parseAbi, recoverAddress, stringToBytes, type Hex } from "viem";
import { short, ZG_EXPLORER, type FlightFile, type FlightRecord } from "@/lib/flight";
import { Badge, cx, Panel } from "./ui";

const galileo = defineChain({
  id: 16602,
  name: "0G Galileo",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
});
const flightLogAbi = parseAbi(["function getAnchors(bytes32 flightId) view returns ((uint64 seq, bytes32 head, bytes32 storageRoot, uint64 time)[])"]);
const ZERO = ("0x" + "00".repeat(32)) as Hex;

type Anchor = { seq: number; head: string };
type Mark = "wait" | "ok" | "bad" | "gone" | "tainted";
type Cheat = "none" | "allow" | "gps" | "delete";

/** Same canonical JSON the officer hashes: keys sorted, no whitespace. */
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

/** The operator's likely lies, applied to a copy of the record. */
function cheat(records: FlightRecord[], how: Cheat): { recs: FlightRecord[]; what: string; seq: number | null } {
  const recs: FlightRecord[] = JSON.parse(JSON.stringify(records));
  if (how === "allow") {
    const d = recs.find((r) => r.type === "DECISION" && r.body?.verdict === "DENY") ?? recs.find((r) => r.type === "DECISION");
    if (d) {
      const was = d.body.verdict;
      d.body.verdict = "ALLOW";
      d.body.reason = "approved";
      return { recs, what: `Record #${d.seq}: 0G's ${was} rewritten as ALLOW`, seq: d.seq };
    }
    // no 0G decisions on this flight (gate disabled): forge an approval onto an unapproved action
    const a = recs.find((r) => r.type === "ACTION" && !r.body?.decisionHash);
    if (a) {
      a.body.decisionHash = "0x" + "ab".repeat(32);
      return { recs, what: `Record #${a.seq}: a fake 0G approval added to ${a.body.cmd?.type ?? "an action"} that never had one`, seq: a.seq };
    }
  }
  if (how === "gps") {
    const st = recs.find((r) => r.type === "STATE" && r.body?.samples?.length);
    if (st) {
      for (const s of st.body.samples) s.pos = [s.pos[0] - 0.6, s.pos[1]];
      return { recs, what: `Record #${st.seq}: GPS track moved 0.6 m to hide where the drone flew`, seq: st.seq };
    }
  }
  if (how === "delete") {
    const i = recs.findIndex((r) => r.type === "ACTION");
    if (i >= 0) {
      const seq = recs[i].seq;
      recs.splice(i, 1);
      return { recs, what: `Record #${seq} (an ACTION) deleted from the log`, seq };
    }
  }
  return { recs, what: "", seq: null };
}

export default function ProofCheck({ flight }: { flight: FlightFile }) {
  const [anchors, setAnchors] = useState<Anchor[] | null>(null);
  const [anchorSrc, setAnchorSrc] = useState<"chain" | "copy">("chain");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; seq?: number } | null>(null);
  const [mode, setMode] = useState<Cheat>("none");
  const [what, setWhat] = useState("");
  const run = useRef(0);

  // anchors straight from 0G Chain (fallback: the copy exported with the flight)
  useEffect(() => {
    const client = createPublicClient({ chain: galileo, transport: http() });
    client
      .readContract({ address: flight.chain.flightLog as Hex, abi: flightLogAbi, functionName: "getAnchors", args: [flight.chain.chainFlightId as Hex] })
      .then((a) => setAnchors(a.map((x) => ({ seq: Number(x.seq), head: x.head }))))
      .catch(() => {
        setAnchorSrc("copy");
        setAnchors(flight.anchors.map((a) => ({ seq: a.seq, head: a.head })));
      });
  }, [flight]);

  const verify = useCallback(
    async (how: Cheat) => {
      if (!anchors) return;
      const id = ++run.current;
      const { recs, what, seq: touched } = cheat(flight.records, how);
      setMode(how);
      setWhat(what);
      setResult(null);
      setRunning(true);
      const total = flight.records.length;
      const m: Mark[] = Array(total).fill("wait");
      setMarks([...m]);
      const signer = flight.chain.operator.toLowerCase();
      const anchorAt = new Map(anchors.map((a) => [a.seq, a.head.toLowerCase()]));
      let prev: string = ZERO;
      let fail: { text: string; seq: number } | null = null;
      let failAt = -1;
      for (let i = 0; i < recs.length && !fail; i++) {
        const r = recs[i];
        const { hash, sig, ...unsigned } = r;
        const h = keccak256(stringToBytes(canonical(unsigned)));
        let why = "";
        if (r.seq !== i) {
          why = `record #${i} is missing: the next one claims to be #${r.seq}`;
          m[i] = "gone";
        } else if (r.prev.toLowerCase() !== prev.toLowerCase()) why = `record #${r.seq} doesn't link to the one before it`;
        else if (h !== hash.toLowerCase()) why = `record #${r.seq} was edited: its fingerprint no longer matches`;
        else if ((await recoverAddress({ hash: hash as Hex, signature: sig as Hex })).toLowerCase() !== signer) why = `record #${r.seq} isn't signed by the operator`;
        else if (anchorAt.has(r.seq) && anchorAt.get(r.seq) !== hash.toLowerCase()) why = `record #${r.seq} doesn't match the fingerprint sealed on 0G Chain`;
        if (run.current !== id) return;
        if (why) {
          if (m[i] !== "gone") m[i] = "bad";
          fail = { text: why, seq: r.seq };
          failAt = i;
        } else m[i] = "ok";
        prev = hash;
        if (i % 3 === 0 || fail) {
          setMarks([...m]);
          await new Promise((res) => setTimeout(res, 16));
        }
      }
      if (!fail) {
        const lastAnchor = anchors.reduce((a, b) => (b.seq > a ? b.seq : a), -1);
        if (recs.length - 1 < lastAnchor) fail = { text: `0G Chain sealed ${lastAnchor + 1} records but only ${recs.length} were handed over`, seq: recs.length };
      }
      if (run.current !== id) return;
      // everything after a broken link can no longer be trusted: the break spreads down the chain
      if (failAt >= 0) for (let k = failAt + 1; k < total; k++) m[k] = "tainted";
      setMarks([...m]);
      setRunning(false);
      setResult(fail ? { ok: false, text: fail.text, seq: fail.seq ?? touched ?? undefined } : { ok: true, text: `All ${recs.length} records re-hashed, linked and signed, and every 0G Chain anchor matches.` });
    },
    [anchors, flight],
  );

  useEffect(() => {
    if (anchors) verify("none");
  }, [anchors, verify]);

  const segFor = (seq: number) => flight.segments.find((g) => seq >= g.fromSeq && seq <= g.toSeq);
  const failSeg = result && !result.ok && result.seq != null ? segFor(Math.min(result.seq, flight.records.length - 1)) : undefined;

  return (
    <Panel
      title="Check it yourself"
      right={<Badge tone="zg">{anchorSrc === "chain" ? "anchors read live from 0G Chain" : "anchors from exported copy"}</Badge>}
    >
      <p className="text-xs leading-relaxed text-[#55595f]">
        Your browser re-checks every record: it recomputes each fingerprint, follows the links, recovers the operator&apos;s signature and compares the result with the fingerprints sealed on 0G Chain during the flight. Nothing here trusts our server.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button onClick={() => verify("none")} disabled={!anchors || running} className={cx("rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-40", mode === "none" ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#b7dcd6] text-[#0f5f59] hover:bg-[#ecf7f5]")}>
          Verify genuine record
        </button>
        <span className="mx-1 self-center text-[11px] text-[#8a8d93]">Try to cheat:</span>
        {([
          ["allow", flight.records.some((r) => r.type === "DECISION") ? "Change DENY → ALLOW" : "Forge a 0G approval"],
          ["gps", "Fake the GPS"],
          ["delete", "Delete a record"],
        ] as [Cheat, string][]).map(([k, label]) => (
          <button key={k} onClick={() => verify(k)} disabled={!anchors || running} className={cx("rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-40", mode === k ? "border-[#b91c1c] bg-[#b91c1c] text-white" : "border-[#f0c4c4] text-[#9b1c1c] hover:bg-[#fdf0f0]")}>
            {label}
          </button>
        ))}
      </div>

      {what && <p className="mt-2 rounded-md bg-[#fdf0f0] px-2.5 py-1.5 font-mono text-[11px] text-[#9b1c1c]">Tampered copy: {what}</p>}

      <div className="mt-3 flex flex-wrap gap-[3px]">
        {marks.map((k, i) => (
          <span
            key={i}
            title={`record #${i} · ${flight.records[i]?.type ?? ""}`}
            className={cx("h-3 w-3 rounded-[2px] transition-colors duration-200", k === "ok" ? "bg-[#0f766e]" : k === "bad" ? "crack bg-[#b91c1c]" : k === "gone" ? "crack border border-dashed border-[#b91c1c] bg-transparent" : k === "tainted" ? "taint bg-[#f3b4b4]" : "bg-[#e3ded3]")}
            style={k === "tainted" ? { ["--d" as string]: `${Math.min(900, (i - marks.findIndex((x) => x === "bad" || x === "gone")) * 14)}ms` } : undefined}
          />
        ))}
      </div>

      <div className={cx("mt-3 rounded-md border px-3 py-2 text-sm", !result ? "border-[#e3ded3] text-[#8a8d93]" : result.ok ? "border-[#b7dcd6] bg-[#ecf7f5] text-[#0f5f59]" : "border-[#f0c4c4] bg-[#fdf0f0] text-[#9b1c1c]")}>
        {!result ? (anchors ? "Checking…" : "Reading anchors from 0G Chain…") : result.ok ? <>✓ Genuine. {result.text}</> : <>✗ Caught: {result.text}. An edited copy can never match what 0G sealed during the flight.</>}
        {failSeg && (
          <div className="mt-1 font-mono text-[11px]">
            sealed in 0G tx{" "}
            <a href={`${ZG_EXPLORER}/tx/${failSeg.anchorTx}`} target="_blank" rel="noreferrer" className="underline">
              {short(failSeg.anchorTx, 12)}
            </a>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#ece7dc] pt-3">
        <span className="text-xs text-[#55595f]">Someone hurt by this flight?</span>
        <Link href={`/claim?flight=${flight.flightId}`} className="rounded-md bg-[#15171a] px-3 py-1.5 text-xs font-semibold text-[#fffdf8] hover:bg-[#33363b]">
          File a claim on Arc →
        </Link>
      </div>
    </Panel>
  );
}
