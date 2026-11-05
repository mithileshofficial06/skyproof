"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx, Logo } from "./ui";

const LINKS = [
  ["/", "Overview"],
  ["/flights", "Flight replays"],
  ["/live", "Live mission"],
  ["/claim", "File a claim"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#05070d]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Logo className="text-[15px]" />
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={cx("rounded-lg px-3 py-1.5 text-[13px] transition", active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200")}>
                {label}
              </Link>
            );
          })}
        </div>
        <div className="hidden items-center gap-1.5 text-[11px] text-slate-400 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          0G Galileo · Arc Testnet
        </div>
      </div>
    </nav>
  );
}
