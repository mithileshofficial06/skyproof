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
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#e3ded3] bg-[#f4f1ea]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link href="/">
          <Logo className="text-[15px]" />
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={cx("rounded-md px-3 py-1.5 text-[13px]", active ? "bg-[#15171a] text-[#f4f1ea]" : "text-[#55595f] hover:text-[#15171a]")}>
                {label}
              </Link>
            );
          })}
        </div>
        <span className="hidden font-mono text-[11px] text-[#8a8d93] md:block">0G Galileo · Arc Testnet</span>
      </div>
    </nav>
  );
}
