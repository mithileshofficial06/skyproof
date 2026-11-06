"use client";
// Verify a record (specs/05-uiux.md 10, P1): load any published flight through the adapter, recompute every
// fingerprint in the browser, compare with the anchors, and download the evidence as JSON.
import { flightIndex } from "@/lib/siteData";
import { useEffect, useState } from "react";
import { source } from "@/lib/data/adapter";
import { verify } from "@/lib/data/hash";
import type { FlightRecord } from "@/lib/data/types";
import { useUI } from "@/lib/store";

type Out = { f: FlightRecord; ok: boolean; firstBad: number; badAnchorSeq: number | null; chain: string[]; at: string };

export function VerifyPanel() {
  const sample = useUI((s) => s.flight?.id ?? "");
  const [id, setId] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<Out | null>(null);
  useEffect(() => {
    flightIndex()
      .then((a) => setIds(a.map((x) => x.flightId)))
      .catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const f = await source.load(id.trim() || undefined);
      const v = verify(f.blocks, f.anchoredHashes, f.anchors);
      setOut({ f, ok: v.ok, firstBad: v.firstBad, badAnchorSeq: v.badAnchorSeq, chain: v.chain, at: new Date().toISOString() });
    } catch (e) {
      setErr((e as Error).message);
      setOut(null);
    } finally {
      setBusy(false);
    }
  };
  const exportJson = () => {
    if (!out) return;
    const { f } = out;
    const evidence = {
      recordId: f.zeroG.recordId,
      flightId: f.id,
      chainHashes: out.chain,
      anchors: f.anchors,
      anchorsFrom: f.anchorsFrom,
      verdict: f.chainlink.verdict,
      breaches: f.chainlink.breaches,
      payment: f.arc,
      verifiedAt: out.at,
      clientVerification: { ok: out.ok, firstBadRecord: out.firstBad, badAnchorSeq: out.badAnchorSeq, records: f.blocks.length },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `skyproof-evidence-${f.id}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-5 border-t border-x-border pt-4">
      <label className="block text-xs text-x-muted">
        Flight ID
        <input list="flight-ids" value={id} onChange={(e) => setId(e.target.value)} placeholder={sample || "sample flight"} className="mt-1 w-full rounded-md border border-x-border bg-x-surface2 px-2 py-1.5 font-mono text-xs text-x-text placeholder:text-x-muted" />
        <datalist id="flight-ids">
          {ids.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={run} disabled={busy} className="rounded-full bg-x-cyan px-4 py-1.5 text-xs font-semibold text-x-bg disabled:opacity-40">
          {busy ? "Checking…" : "Verify in my browser"}
        </button>
        <button onClick={exportJson} disabled={!out} className="rounded-full border border-x-border px-4 py-1.5 text-xs font-semibold text-x-text disabled:opacity-40">
          Download evidence
        </button>
      </div>
      {err && <p className="mt-2 font-mono text-[11px] text-x-danger">{err}</p>}
      {out && (
        <div aria-live="polite" className="mt-3 space-y-1 font-mono text-[11px]">
          <p className={out.ok ? "text-x-pass" : "text-x-danger"}>{out.ok ? `OK: all ${out.f.blocks.length} fingerprints recomputed and every anchor matches` : `Broken: first bad record #${out.firstBad}${out.badAnchorSeq !== null ? `, anchor #${out.badAnchorSeq} disagrees` : ""}`}</p>
          <p className="text-x-muted">
            anchors {out.f.anchorsFrom === "0g-chain" ? "read live from 0G Chain" : "from the published export (replay)"} · judge: {out.f.chainlink.verdict}
          </p>
          <p className="flex flex-wrap gap-3">
            <a href={out.f.zeroG.url} target="_blank" rel="noreferrer" className="text-x-cyan underline underline-offset-2">0G ↗</a>
            {out.f.chainlink.url && <a href={out.f.chainlink.url} target="_blank" rel="noreferrer" className="text-x-cyan underline underline-offset-2">Chainlink trigger ↗</a>}
            {out.f.arc.url && <a href={out.f.arc.url} target="_blank" rel="noreferrer" className="text-x-cyan underline underline-offset-2">Arc ↗</a>}
          </p>
        </div>
      )}
    </div>
  );
}
