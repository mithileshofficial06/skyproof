"use client";
// Tamper playground (specs/05-uiux.md 9; ending per owner decision, specs/05a D14): edit ONE value in a local copy of
// the real sealed flight, recompute the chain in the browser, and watch the copy fail against the 0G anchors.
// Honest ending: the judge never uses a copy someone hands over; it reads the sealed record from 0G.
import { useEffect, useMemo, useState } from "react";
import { buildChain, tamper, tamperSample, verify } from "@/lib/data/hash";
import { prefersReducedMotion } from "@/lib/quality";
import { useUI } from "@/lib/store";

type Result = { at: number; broken: number; total: number; anchorSeq: number | null; what: string };

export function TamperPanel() {
  const flight = useUI((s) => s.flight);
  const selected = useUI((s) => s.selected);
  const verdict = useUI((s) => s.verdict);
  const [value, setValue] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const rec = flight && selected !== null ? flight.blocks[selected] : null;
  const kind = rec?.type === "STATE" ? "alt" : rec?.type === "DECISION" && rec.body?.verdict ? "verdict" : null;
  const original = useMemo(() => (rec && kind === "alt" ? Number(rec.body.samples[0].alt) : 0), [rec, kind]);

  // default pick: the first altitude record after take-off, so "Apply" works straight away
  useEffect(() => {
    if (flight && useUI.getState().selected === null) useUI.getState().setSelected(flight.blocks.findIndex((r, i) => r.type === "STATE" && i > 8));
  }, [flight]);
  useEffect(() => setValue(Number((original + 0.6).toFixed(2))), [original]);

  if (!flight) return null;

  const apply = () => {
    if (selected === null || !rec) return;
    const edited =
      kind === "alt"
        ? tamperSample(flight.blocks, selected, 0, { alt: value })
        : tamper(flight.blocks, selected, (r) => (r.body.verdict = r.body.verdict === "ALLOW" ? "DENY" : "ALLOW"));
    const v = verify(edited, flight.anchoredHashes, flight.anchors);
    const chain = buildChain(edited);
    const broken = chain.filter((h, i) => h !== flight.anchoredHashes[i]).length;
    const st = useUI.getState();
    st.setMode("sandbox");
    st.setVerdict("pending");
    st.startTamper(v.firstBad < 0 ? selected : v.firstBad, kind === "alt" ? value - original : 1);
    if (prefersReducedMotion()) useUI.setState({ tamperClock: performance.now() / 1000 - 10 }); // end state at once
    setResult({ at: selected, broken, total: chain.length, anchorSeq: v.badAnchorSeq, what: kind === "alt" ? `altitude ${original.toFixed(2)} → ${value.toFixed(2)} m` : `0G's ${rec.body.verdict} flipped` });
  };
  const reset = () => {
    useUI.getState().resetTamper();
    useUI.getState().setMode(flight.source);
    setResult(null);
  };

  return (
    <div id="playground" className="mt-5 border-t border-x-border pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-x-cyan">Try to tamper · local simulation</p>
      <p className="mt-1 text-xs text-x-muted">Nothing you change here touches a real record. Pick a record (or click a cube), change one number.</p>
      <label className="mt-3 block text-xs text-x-muted">
        Record
        <select value={selected ?? ""} onChange={(e) => useUI.getState().setSelected(Number(e.target.value))} disabled={!!result} className="mt-1 w-full rounded-md border border-x-border bg-x-surface2 px-2 py-1.5 font-mono text-xs text-x-text">
          {flight.blocks.map((r, i) => (
            <option key={i} value={i}>
              #{i} · {r.type}
            </option>
          ))}
        </select>
      </label>
      {kind === "alt" && (
        <label className="mt-2 block text-xs text-x-muted">
          Altitude of its first sample (m)
          <div className="mt-1 flex items-center gap-2">
            <input type="range" min={0} max={3} step={0.05} value={value} onChange={(e) => setValue(Number(e.target.value))} disabled={!!result} className="flex-1 accent-x-cyan" aria-label="altitude" />
            <input type="number" min={0} max={3} step={0.05} value={value} onChange={(e) => setValue(Number(e.target.value))} disabled={!!result} className="w-20 rounded-md border border-x-border bg-x-surface2 px-2 py-1 font-mono text-xs text-x-text" />
          </div>
        </label>
      )}
      {kind === "verdict" && <p className="mt-2 text-xs text-x-muted">This is a 0G decision: Apply flips its verdict ({rec?.body.verdict} → {rec?.body.verdict === "ALLOW" ? "DENY" : "ALLOW"}).</p>}
      {!kind && <p className="mt-2 text-xs text-x-amber">Pick an altitude (STATE) or decision (DECISION) record to edit.</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={apply} disabled={!kind || !!result} className="rounded-full bg-x-cyan px-4 py-1.5 text-xs font-semibold text-x-bg disabled:opacity-40">
          Apply change
        </button>
        <button onClick={reset} disabled={!result} className="rounded-full border border-x-border px-4 py-1.5 text-xs font-semibold text-x-text disabled:opacity-40">
          Reset
        </button>
      </div>
      {result && (
        <ol aria-live="polite" className="mt-3 space-y-1 font-mono text-[11px]">
          <li className="text-x-amber">1. Record #{result.at} changed: {result.what}</li>
          <li className={verdict === "fail" ? "text-x-danger" : "text-x-muted"}>2. {verdict === "fail" ? `${result.broken} of ${result.total} fingerprints no longer match` : "Recomputing fingerprints…"}</li>
          {verdict === "fail" && (
            <>
              <li className="text-x-danger">3. Copy ≠ 0G Chain{result.anchorSeq !== null ? ` (anchor at #${result.anchorSeq} disagrees)` : ""}: verification FAIL</li>
              <li className="text-x-text">4. The Chainlink judge ignores this copy and uses the sealed record on 0G.</li>
              <li className="text-x-pass">5. Payment follows the sealed record, not the edit. A broken or missing record would itself be breach B5.</li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
