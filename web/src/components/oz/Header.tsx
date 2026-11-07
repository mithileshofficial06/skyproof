"use client";
// Ported from ozky: logo top-left and a menu pill top-right, sliding in from the edges. The logo reads the tone of
// the section beneath it (dark sections opt in with data-nav="light"). Hides once the footer is half on screen.
// SkyProof keeps two quick pills next to the menu: Live and Report an incident.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx } from "../ui";
import { OzLogo } from "./Logo";

function toneAt(el: HTMLElement | null): "dark" | "light" {
  if (!el) return "dark";
  const r = el.getBoundingClientRect();
  for (const h of document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)) {
    if (h.closest("header")) continue;
    const navEl = h.closest("[data-nav]");
    if (navEl) return navEl.getAttribute("data-nav") === "light" ? "light" : "dark";
  }
  return "dark";
}

export function Header({ onMenu, forceTone }: { onMenu: () => void; forceTone?: "dark" | "light" }) {
  const logoEl = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tone, setTone] = useState<"dark" | "light">("dark");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    // hide the header near the footer, but only after the visitor scrolled: on short pages the footer is
    // already half on screen at the top, and the menu must stay reachable there
    let footerOn = false;
    const sync = () => {
      setTone(forceTone ?? toneAt(logoEl.current));
      setHidden(footerOn && window.scrollY > 160);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const footerEl = document.querySelector("[data-footer]");
    const io = footerEl
      ? new IntersectionObserver(
          (e) => {
            footerOn = e[0].isIntersecting;
            sync();
          },
          { threshold: 0.5 },
        )
      : null;
    if (footerEl && io) io.observe(footerEl);
    const t = setInterval(sync, 800); // route changes swap the section under the logo
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      io?.disconnect();
      clearInterval(t);
    };
  }, [forceTone]);

  const pill = "mono pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] transition-transform duration-700 ease-in-out";
  return (
    <header className={cx("pointer-events-none fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-in-out", hidden && "-translate-y-full opacity-0")}>
      <div className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <Link ref={logoEl} href="/" aria-label="SkyProof home" className="pointer-events-auto transition-transform duration-700 ease-in-out hover:opacity-70" style={{ transform: mounted ? "translateX(0)" : "translateX(-340%)" }}>
          <OzLogo size={28} tone={tone} />
        </Link>
        <div className="flex items-center gap-2" style={{ transform: mounted ? "translateX(0)" : "translateX(340%)", transition: "transform 700ms ease-in-out" }}>
          <Link href="/live" className={cx(pill, "hidden border border-ink bg-grey text-ink sm:flex")}>
            <span className="blink h-1.5 w-1.5 rounded-full bg-ink" /> Live
          </Link>
          <Link href="/claim" className={cx(pill, "hidden bg-ink text-gold sm:flex")}>
            Report an incident
          </Link>
          <button onClick={onMenu} className={cx(pill, "bg-grey text-ink")} aria-label="Open menu">
            <span className="flex w-4 flex-col gap-[3px]">
              <span className="h-[1.5px] w-full bg-ink" />
              <span className="h-[1.5px] w-2/3 bg-ink" />
            </span>
            <span className="hidden lg:inline">Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
