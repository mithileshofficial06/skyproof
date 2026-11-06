"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx, Logo } from "./ui";

const LINKS = [
  ["/", "Overview"],
  ["/flights", "Flights"],
  ["/live", "Live"],
  ["/claim", "File a claim"],
  ["/insurer", "Insurer"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b1017]/92 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="cockpit">
          <Logo className="text-[15px]" dark />
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={cx("relative rounded-md px-3 py-1.5 text-[13px] transition-colors", active ? "bg-white/10 text-white" : "text-[#94a3b3] hover:text-white")}>
                {label}
                {active && <span className="absolute inset-x-3 -bottom-[9px] h-[2px] rounded-full bg-[#22d3ee]" />}
              </Link>
            );
          })}
        </div>
        <span className="hidden items-center gap-2 font-mono text-[11px] text-[#6c7c8d] md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] blink" />
          <span className="text-[#b4a2ff]">0G Galileo</span>·<span className="text-[#93a7ec]">Chainlink CRE</span>·<span className="text-[#67d4e2]">Arc Testnet</span>
        </span>
      </div>
    </nav>
  );
}
