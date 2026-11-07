"use client";
// Ported from ozky: gold footer, a rounded ink box rising in with the logo, nav, tagline, details and links, and a
// giant wordmark; legal line underneath.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { footer, nav } from "@/lib/ozContent";
import { gsap, reducedMotion } from "@/lib/ozScroll";
import { OzLogo } from "./Logo";

export function Footer() {
  const root = useRef<HTMLElement>(null);
  // Reveal when the footer actually enters the viewport. A visibility observer (not pre-measured scroll
  // positions) keeps working when a page grows after loading or the route changes under the persistent footer.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
    const box = q("[data-box]");
    const text = q("[data-ftext]");
    if (reducedMotion()) return;
    gsap.set(box, { y: 80, autoAlpha: 0 });
    gsap.set(text, { y: -28, autoAlpha: 0 });
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      gsap.to(box, { y: 0, autoAlpha: 1, duration: 1.1, ease: "power2.inOut" });
      gsap.to(text, { y: 0, autoAlpha: 1, duration: 1, ease: "power2.inOut", stagger: 0.08, delay: 0.15 });
    };
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && play(), { threshold: 0.05 });
    io.observe(el);
    return () => {
      io.disconnect();
      gsap.killTweensOf([...box, ...text]);
      gsap.set([...box, ...text], { clearProps: "all" }); // never leave the footer hidden
    };
  }, []);

  const ext = (h: string) => /^https?:/.test(h);
  return (
    <footer ref={root} data-footer className="bg-gold px-5 pb-8 pt-8 sm:px-8">
      <div data-box className="flex min-h-[62dvh] flex-col rounded-[16px] bg-ink px-7 py-10 text-gold sm:px-10 sm:py-12 lg:h-[85dvh] lg:min-h-[85dvh]">
        <div className="flex flex-wrap items-start gap-x-16 gap-y-10">
          <div data-ftext>
            <OzLogo tone="gold" size={30} />
          </div>
          <nav className="ml-auto flex flex-wrap items-start justify-end gap-x-12 gap-y-6 text-right">
            {nav.map((item) => (
              <div key={item.label} data-ftext className="font-display text-base font-medium leading-tight">
                <Link href={item.href} className="transition-colors hover:text-grey">
                  {item.label}
                  {item.children && <sup className="ml-0.5 text-[0.5em]">{item.children.length}</sup>}
                </Link>
                {item.children && (
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {item.children.map((c) => (
                      <li key={c.label}>
                        <Link href={c.href} className="transition-colors hover:text-grey">
                          {c.label} ↲
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        </div>
        <div data-ftext className="mt-10 flex flex-row flex-wrap justify-between gap-4 lg:mt-14">
          <p className="mono max-w-[18ch] text-left text-[10px] leading-relaxed sm:text-[11px]">
            {footer.tagline.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <p className="mono text-center text-[10px] leading-relaxed sm:text-[11px]">
            {footer.address.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <ul className="mono space-y-1 text-right text-[10px] leading-relaxed sm:text-[11px]">
            {footer.links.map((l) => (
              <li key={l.label}>
                <a href={l.href} target={ext(l.href) ? "_blank" : undefined} rel="noreferrer" className="transition-colors hover:text-grey">
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div data-ftext aria-hidden className="mt-auto select-none self-center pt-8 font-display font-semibold leading-[0.8] tracking-[-0.05em] text-gold" style={{ fontSize: "clamp(4rem, 17vw, 16rem)" }}>
          SkyProof
        </div>
      </div>
      <div data-ftext className="mono mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] text-ink">
        {footer.legal.map((item) =>
          item.href ? (
            <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-60">
              {item.label}
            </a>
          ) : (
            <span key={item.label}>{item.label}</span>
          ),
        )}
      </div>
    </footer>
  );
}
