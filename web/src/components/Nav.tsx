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
  ["/experience", "3D experience"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <div className="flex w-full max-w-[1100px] origin-top items-center gap-2 rounded-full border border-white/12 bg-[#06071c]/55 py-1.5 pl-4 pr-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,max-width,padding,background-color,box-shadow] duration-300 ease-out hover:max-w-[1240px] hover:scale-[1.06] hover:bg-[#06071c]/75 hover:py-2 hover:shadow-[0_14px_44px_rgba(0,0,0,0.5)]">
        <Link href="/" className="cockpit shrink-0">
          <Logo className="text-[15px]" dark />
        </Link>
        <div className="mx-auto flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] md:overflow-visible">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={cx("rounded-full px-3 py-1.5 text-[13px] transition-colors", active ? "bg-white/12 text-white" : "text-[#b4b7e0] hover:text-white")}>
                {label}
              </Link>
            );
          })}
        </div>
        <Link href="/live" className="hidden shrink-0 items-center gap-2 rounded-full bg-[#f5f6ff] px-4 py-1.5 text-[13px] font-semibold text-[#0a0d24] transition-colors hover:bg-white md:flex">
          <span className="blink h-1.5 w-1.5 rounded-full bg-[#ff4d4f]" />
          Watch live
        </Link>
      </div>
    </nav>
  );
}
