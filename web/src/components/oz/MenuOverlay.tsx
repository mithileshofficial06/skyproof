"use client";
// Ported from ozky: a floating popup anchored top-right with big display links bottom-left; items with
// sub-pages expand one at a time.
import Link from "next/link";
import { useEffect, useState } from "react";
import { nav } from "@/lib/ozContent";
import { cx } from "../ui";

export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const close = () => {
    setExpanded(null);
    onClose();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const big = "font-display w-fit text-[clamp(2rem,7vw,2.4rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-ink lg:text-[clamp(1.4rem,2.6vw,2.2rem)]";
  return (
    <>
      <div onClick={close} aria-hidden className={cx("fixed inset-0 z-[60] bg-ink/40 transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside
        aria-hidden={!open}
        aria-label="Menu"
        className={cx(
          "fixed right-4 top-4 z-[70] flex min-h-[60dvh] w-[88dvw] min-w-0 origin-top-right flex-col rounded-[18px] bg-grey p-7 text-ink shadow-xl transition-all duration-300 ease-in-out sm:min-h-[40dvw] sm:w-[40dvw] sm:min-w-[340px]",
          !open && "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="flex justify-end">
          <button onClick={close} className="mono flex items-center gap-2 text-[11px] text-ink" tabIndex={open ? 0 : -1}>
            <span className="text-base leading-none">&times;</span> Close
          </button>
        </div>
        <nav className="mt-auto flex flex-col items-start">
          {nav.map((item) =>
            item.children ? (
              <div key={item.label}>
                <button onClick={() => setExpanded(expanded === item.label ? null : item.label)} className={cx(big, "flex items-start")} tabIndex={open ? 0 : -1} aria-expanded={expanded === item.label}>
                  {item.label}
                  <sup className="ml-0.5 mt-5 text-[0.5em] font-medium">{item.children.length}</sup>
                </button>
                <ul className={cx("overflow-hidden pb-1 pl-1 transition-[max-height] duration-300 ease-in-out", expanded === item.label ? "max-h-60" : "max-h-0")}>
                  {item.children.map((c) => (
                    <li key={c.label}>
                      <Link href={c.href} onClick={close} tabIndex={open && expanded === item.label ? 0 : -1} className="block py-0.5 font-display text-[clamp(1.1rem,4vw,1.3rem)] font-medium text-ink lg:text-[clamp(0.95rem,1.4vw,1.2rem)]">
                        ↳ {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Link key={item.label} href={item.href} onClick={close} className={big} tabIndex={open ? 0 : -1}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>
    </>
  );
}
