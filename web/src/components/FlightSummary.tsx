"use client";
// The plain-English flight summary (officer/src/flight-summary.ts), shown under the replay for insurers
// and anyone new to SkyProof. Collapsible; downloadable as text.
import { useEffect, useState } from "react";
import { Panel } from "./ui";
import { flightFile } from "@/lib/siteData";

export function FlightSummary({ flightId }: { flightId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    flightFile(`${flightId}.summary.txt`)
      .then((r) => (r.ok ? r.text() : null))
      .then(setText)
      .catch(() => setText(null));
  }, [flightId]);
  if (!text) return null;
  return (
    <Panel
      className="scroll-mt-24"
      id="summary"
      title="Plain-English summary"
      right={
        <div className="flex items-center gap-2">
          <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download={`${flightId}.summary.txt`} className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#f5f6ff] hover:bg-white/20">
            Download .txt
          </a>
          <button onClick={() => setOpen((o) => !o)} className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#f5f6ff] hover:bg-white/20">
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-[#e1e3fa]">A readable account of this flight for insurers, investigators and anyone new to SkyProof, generated from the sealed record.</p>
      {open && <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-[#06071c]/70 p-4 font-mono text-[12.5px] leading-relaxed text-[#e6e8ff]">{text}</pre>}
    </Panel>
  );
}
