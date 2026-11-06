"use client";
// Ported from ozky's Lander: a 3/4 left column (giant gold title, a full-width band, three feature cards with
// NW→SE drawn borders) and a 1/4 right column that bottom-pins (tagline + wordmark, system status with the rune
// field, a gold "explore" square with a shuttling arrow). Blocks colour-fill top → bottom on load.
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { lander } from "@/lib/ozContent";
import { gsap, reducedMotion, ScrollTrigger } from "@/lib/ozScroll";
import { RuneGlitch } from "./RuneGlitch";

export function Lander({ band }: { band: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const rightCol = useRef<HTMLElement>(null);
  const [stickyTop, setStickyTop] = useState(0);

  useEffect(() => {
    const measure = () => setStickyTop(!rightCol.current || window.innerWidth < 1024 ? 0 : window.innerHeight - rightCol.current.offsetHeight);
    measure();
    window.addEventListener("resize", measure);
    const root = section.current;
    if (!root) return () => window.removeEventListener("resize", measure);
    const q = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
    const tw: gsap.core.Tween[] = [];
    tw.push(gsap.fromTo(q("[data-load]"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 2, ease: "power2.inOut", stagger: 0.12 }));
    tw.push(gsap.from(q("[data-title-line]"), { yPercent: 115, duration: 3, ease: "power3.inOut", stagger: 0.14, delay: 0.15 }));
    const arrow = q("[data-arrow]")[0];
    const explore = q("[data-explore]")[0];
    if (!reducedMotion() && arrow && explore) tw.push(gsap.to(arrow, { x: -8, y: 8, repeat: -1, yoyo: true, duration: 1.5, ease: "sine.inOut", scrollTrigger: { trigger: explore, start: "top 50%" } }));
    q("[data-onscreen]").forEach((el) => tw.push(gsap.from(el, { y: 56, autoAlpha: 0, duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 85%" } })));
    q("[data-feat-border]").forEach((el) => tw.push(gsap.fromTo(el, { clipPath: "inset(0 100% 100% 0)" }, { clipPath: "inset(0 0% 0% 0)", duration: 4, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 85%" } })));
    ScrollTrigger.refresh();
    return () => {
      window.removeEventListener("resize", measure);
      tw.forEach((t) => (t.scrollTrigger?.kill(), t.kill()));
    };
  }, []);

  const big = "-mb-[0.2em] w-[80dvw] overflow-hidden pb-[0.2em] font-display text-[clamp(3.6rem,17vw,11rem)] font-semibold leading-[0.8] tracking-[-0.04em] lg:w-auto";
  return (
    <section ref={section} data-nav className="relative grid w-full grid-cols-2 lg:flex lg:items-start">
      {/* LEFT 3/4: title · band · features */}
      <div className="contents lg:flex lg:w-3/4 lg:flex-col">
        <div data-load className="order-1 col-span-2 flex h-[75dvh] flex-col justify-center bg-gold px-5 pt-24 text-ink sm:px-8 lg:order-none">
          <p className="mb-4 max-w-[34ch] font-display text-[clamp(0.95rem,3.4vw,1.4rem)] font-medium leading-tight lg:hidden">{lander.subhead}</p>
          <div className="flex flex-wrap items-start gap-x-12 gap-y-4">
            <h1 className={big}>
              <span data-title-line className="block">
                {lander.titleTop}
              </span>
            </h1>
            <p className="mt-3 hidden max-w-[22ch] font-display text-[clamp(1rem,1.6vw,1.4rem)] font-medium leading-tight lg:block">{lander.subhead}</p>
          </div>
          <h1 className={big} aria-hidden>
            <span data-title-line className="block">
              {lander.titleBottom}
            </span>
          </h1>
        </div>
        <div data-load data-nav="light" className="order-2 col-span-2 h-[40dvh] w-full overflow-hidden bg-ink lg:order-none lg:h-[80dvh]">
          {band}
        </div>
        <div className="order-6 col-span-2 grid grid-cols-1 lg:order-none lg:grid-cols-3">
          {lander.feats.map((f) => (
            <article key={f.title} data-onscreen className="relative aspect-[2/1] p-7 lg:aspect-[3/2] lg:p-8">
              <div data-feat-border className="pointer-events-none absolute inset-0 border border-ink" />
              <p className="mono text-[10px] text-ink">{f.tag}</p>
              <h3 className="mt-4 font-display text-[clamp(1rem,1.4vw,1.35rem)] font-medium leading-tight text-ink">{f.title}</h3>
              <p className="mono absolute bottom-7 left-7 right-7 text-[10px] leading-[1.7] text-ink lg:bottom-8 lg:left-8 lg:right-8">{f.body}</p>
            </article>
          ))}
        </div>
      </div>

      {/* RIGHT 1/4: tagline · system status · explore (bottom-pins on desktop) */}
      <aside ref={rightCol} className="contents lg:sticky lg:flex lg:w-1/4 lg:flex-col lg:self-start" style={{ top: stickyTop }}>
        <div data-load className="order-4 col-span-1 flex aspect-square flex-col justify-between bg-grey px-5 pb-6 pt-6 text-ink lg:order-none lg:aspect-auto lg:h-[50dvh] lg:px-7 lg:pb-8 lg:pt-24">
          <p className="font-display text-[clamp(0.85rem,3.4vw,1.05rem)] font-medium leading-snug lg:text-[clamp(1.05rem,1.4vw,1.35rem)]">{lander.tagline}</p>
          <span className="self-center font-display text-[clamp(1.6rem,3vw,2.8rem)] font-semibold tracking-[-0.05em]">SkyProof</span>
        </div>
        <div data-load data-nav="light" className="order-3 col-span-2 flex h-[55dvh] flex-col bg-ink px-7 py-7 text-grey lg:order-none lg:h-[65dvh]">
          <h3 className="font-display text-xl font-medium">System status</h3>
          <ol className="mono mt-4 space-y-[3px] text-[9px] text-grey">
            {lander.status.map((s, i) => (
              <li key={s} className="flex items-center justify-between gap-2">
                <span>
                  {String(i + 1).padStart(2, "0")}. {s}
                </span>
                <span className="text-gold">&bull;</span>
              </li>
            ))}
          </ol>
          <div className="mt-auto pt-6">
            <RuneGlitch />
          </div>
        </div>
        <Link href={lander.exploreHref} data-onscreen data-explore className="order-5 col-span-1 flex aspect-square flex-col justify-between bg-gold p-5 text-ink lg:order-none lg:p-7">
          {/* eslint-disable-next-line @next/next/no-img-element -- static decorative svg */}
          <img data-arrow src="/oz/arrow_l.svg" alt="" aria-hidden className="h-[3rem] w-[3rem] self-end object-contain lg:h-[5.2rem] lg:w-[5.2rem]" />
          <span className="font-display text-[clamp(0.95rem,3.6vw,1.2rem)] font-medium leading-tight lg:text-[clamp(1.1rem,1.5vw,1.6rem)]">{lander.exploreLabel}</span>
        </Link>
      </aside>
    </section>
  );
}
