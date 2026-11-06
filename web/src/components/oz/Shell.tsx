"use client";
// The ozky shell around every page: initial loader, header + menu, smooth scroll, footer.
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { getLenis, initScroll, releaseAnimations } from "@/lib/ozScroll";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Loader } from "./Loader";
import { MenuOverlay } from "./MenuOverlay";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const done = useCallback(() => setLoaded(true), []);
  const experience = path.startsWith("/experience"); // has its own Lenis + full-screen canvas
  const bleed = path === "/"; // full-width section layouts

  useEffect(() => {
    const safety = setTimeout(releaseAnimations, 4000); // never leave GSAP paused
    if (experience) return () => clearTimeout(safety);
    const teardown = initScroll();
    return () => {
      clearTimeout(safety);
      teardown();
    };
  }, [experience]);

  // new page: start at the top (Lenis keeps its own scroll target); hash links are left to the browser
  useEffect(() => {
    if (window.location.hash) return;
    const l = getLenis();
    if (l) l.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [path]);

  return (
    <>
      {!loaded && <Loader onComplete={done} />}
      <Header onMenu={() => setMenuOpen(true)} forceTone={experience ? "light" : undefined} />
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className={bleed ? "" : "mx-auto w-full max-w-[1400px] px-5 pb-20 pt-24 sm:px-8"}>{children}</main>
      {!experience && <Footer />}
    </>
  );
}
