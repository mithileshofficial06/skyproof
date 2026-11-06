"use client";
// Ported from ozky's home sections: Solutions (horizontal card track with arrows), Insights (pinned image + ink
// block beside a 2-up tile grid) and the gold CTA. Content comes from lib/ozContent.ts.
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cta, integrates, roles } from "@/lib/ozContent";
import { gsap, ScrollTrigger } from "@/lib/ozScroll";
import { OzButton } from "./Button";
import { GRAPHICS } from "./Graphics";

const ext = (h: string) => /^https?:/.test(h);

export function Roles() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const scrollByCard = (dir: 1 | -1) => {
    const t = track.current;
    if (!t) return;
    const w = t.querySelector("article")?.getBoundingClientRect().width ?? t.clientWidth / 3;
    const target = Math.max(0, Math.min(t.scrollWidth - t.clientWidth, t.scrollLeft + dir * w));
    const proxy = { x: t.scrollLeft };
    gsap.to(proxy, { x: target, duration: 0.8, ease: "power2.inOut", onUpdate: () => void (t.scrollLeft = proxy.x) });
  };
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    const q = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
    const tw: gsap.core.Tween[] = [
      gsap.fromTo(q("[data-title]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: root, start: "top 80%" } }),
      gsap.from(q("[data-arrows]"), { xPercent: 180, autoAlpha: 0, duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: root, start: "top 80%" } }),
    ];
    q("[data-vector]").forEach((el) => tw.push(gsap.from(el, { scale: 0.55, autoAlpha: 0, duration: 1.2, ease: "power2.inOut", transformOrigin: "center", scrollTrigger: { trigger: el, start: "top 88%" } })));
    ScrollTrigger.refresh();
    return () => tw.forEach((t) => (t.scrollTrigger?.kill(), t.kill()));
  }, []);
  const arrowBtn = "grid h-[2.1rem] w-[2.1rem] place-items-center rounded-full bg-ink text-grey transition-colors hover:bg-gold hover:text-ink";
  return (
    <section ref={section} id="roles" className="bg-grey pt-16 text-ink">
      <div className="flex items-end justify-between gap-6 px-5 pb-10 sm:px-8">
        <h2 data-title className="max-w-[16ch] font-display text-[clamp(1.4rem,2.8vw,2.3rem)] font-normal leading-[1.05] tracking-[-0.02em]">
          {roles.heading}
        </h2>
        <div data-arrows className="hidden shrink-0 gap-2.5 lg:flex">
          <button onClick={() => scrollByCard(-1)} aria-label="Previous" className={arrowBtn}>
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
              <path d="M15 5 L8 12 L15 19" stroke="currentColor" strokeWidth="2.4" />
            </svg>
          </button>
          <button onClick={() => scrollByCard(1)} aria-label="Next" className={arrowBtn}>
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
              <path d="M9 5 L16 12 L9 19" stroke="currentColor" strokeWidth="2.4" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={track} data-lenis-prevent className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {roles.cards.map((c, i) => {
          const G = GRAPHICS[c.graphic];
          return (
            <article key={c.title} className={`group flex min-h-[52vh] w-[88vw] shrink-0 snap-start flex-col border border-ink bg-grey p-7 transition-colors duration-300 hover:bg-gold sm:w-[60vw] sm:p-9 lg:min-h-[70vh] lg:w-[calc(100%/3)] ${i > 0 ? "-ml-px" : ""}`}>
              <div className="grid flex-1 place-items-center">
                <div data-vector>
                  <G className="h-36 w-36 text-ink lg:h-52 lg:w-52" />
                </div>
              </div>
              <h3 className="font-display text-[clamp(1.4rem,2vw,1.9rem)] font-medium tracking-[-0.02em]">{c.title}</h3>
              <p className="mono mt-4 max-w-[42ch] text-[11px] leading-[1.7] text-ink">{c.body}</p>
              <div className="mt-7">
                <Link href={c.href} className="mono inline-flex items-center rounded-full border border-ink px-7 py-3 text-[11px] leading-none text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-grey">
                  {c.cta} ↗
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Insights({ visual }: { visual: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const leftCol = useRef<HTMLDivElement>(null);
  const [stickyTop, setStickyTop] = useState(0);
  useEffect(() => {
    const measure = () => setStickyTop(!leftCol.current || window.innerWidth < 1024 ? 0 : window.innerHeight - leftCol.current.offsetHeight);
    measure();
    window.addEventListener("resize", measure);
    const root = section.current;
    if (!root) return () => window.removeEventListener("resize", measure);
    const q = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
    const one = (s: string) => root.querySelector<HTMLElement>(s);
    const tw: gsap.core.Tween[] = [
      gsap.from(q("[data-img]"), { autoAlpha: 0, duration: 1.8, ease: "power2.inOut", scrollTrigger: { trigger: one("[data-img]"), start: "top 92%" } }),
      gsap.fromTo(q("[data-fill]"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: one("[data-fill]"), start: "top 85%" } }),
    ];
    q("[data-cell]").forEach((el) => tw.push(gsap.from(el, { autoAlpha: 0, y: 40, duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 88%" } })));
    q("[data-cell-border]").forEach((el) => tw.push(gsap.fromTo(el, { clipPath: "inset(0 100% 100% 0)" }, { clipPath: "inset(0 0% 0% 0)", duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 88%" } })));
    ScrollTrigger.refresh();
    return () => {
      window.removeEventListener("resize", measure);
      tw.forEach((t) => (t.scrollTrigger?.kill(), t.kill()));
    };
  }, []);
  return (
    <section ref={section} id="how" className="flex w-full flex-col items-start bg-grey text-ink lg:flex-row">
      <div ref={leftCol} className="flex w-full flex-col lg:sticky lg:w-1/2 lg:self-start" style={{ top: stickyTop }}>
        <div data-nav="light" data-img className="h-[30dvh] w-full overflow-hidden bg-ink lg:h-[45dvh]">
          {visual}
        </div>
        <div data-fill data-nav="light" className="flex h-[40dvh] flex-col justify-end bg-ink p-7 text-grey lg:h-[55dvh] lg:p-10">
          <h2 className="font-display text-[clamp(2.2rem,4.4vw,4rem)] font-medium leading-[0.98] tracking-[-0.03em]">{integrates.title}</h2>
          <p className="mono mt-5 max-w-[40ch] text-[11px] leading-[1.8] text-grey">{integrates.blurb}</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 border-b border-r border-ink lg:w-1/2">
        {integrates.items.map((it) => {
          const inner = (
            <>
              <div data-cell-border className="pointer-events-none absolute inset-0 border-l border-t border-current" />
              <h3 className="font-display text-[clamp(1.05rem,4vw,2rem)] font-medium tracking-[-0.02em] lg:text-[clamp(1.3rem,1.9vw,1.9rem)]">{it.title}</h3>
              <p className="mono mt-3 text-[10px] tracking-[0.08em]">{it.sub}</p>
            </>
          );
          const cls = "group relative flex h-[26dvh] flex-col justify-end p-5 text-ink transition-colors duration-300 hover:bg-ink hover:text-grey lg:h-[45dvh] lg:p-8";
          return ext(it.href) ? (
            <a key={it.title} href={it.href} target="_blank" rel="noreferrer" data-cell className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={it.title} href={it.href} data-cell className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function Cta() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = section.current?.querySelector<HTMLElement>("[data-cta]");
    if (!el) return;
    const t = gsap.from(el, { clipPath: "inset(0 100% 0 0)", y: 50, duration: 1.2, ease: "power2.inOut", scrollTrigger: { trigger: section.current, start: "top 75%" } });
    ScrollTrigger.refresh();
    return () => (t.scrollTrigger?.kill(), void t.kill());
  }, []);
  return (
    <section ref={section} className="grid min-h-[70vh] place-items-center bg-gold px-8 py-24 text-ink">
      <div data-cta className="flex flex-col items-center gap-12">
        <h2 className="text-center font-display text-[clamp(2.6rem,8vw,7rem)] font-semibold leading-[0.92] tracking-[-0.04em]">
          {cta.lead}
          <br />
          {cta.emphasis}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <OzButton href={cta.primary.href} variant="solid-dark">
            {cta.primary.label}
          </OzButton>
          <OzButton href={cta.secondary.href} variant="outline">
            {cta.secondary.label}
          </OzButton>
        </div>
      </div>
    </section>
  );
}
