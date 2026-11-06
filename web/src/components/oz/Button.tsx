// Ported from ozky: mono pill button / link.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../ui";

type Variant = "outline" | "solid-dark" | "solid-light";
const base = "mono inline-flex items-center justify-center rounded-full border px-7 py-3 text-[11px] leading-none transition-colors duration-200";
const variants: Record<Variant, string> = {
  outline: "border-current bg-transparent hover:bg-ink hover:text-grey",
  "solid-dark": "border-ink bg-ink text-gold hover:bg-[#333]",
  "solid-light": "border-grey bg-grey text-ink hover:bg-white",
};

export function OzButton({ href, variant = "outline", className, children, ...rest }: { href?: string; variant?: Variant; className?: string; children: ReactNode } & Omit<ComponentProps<"button">, "className" | "children">) {
  const cls = cx(base, variants[variant], className);
  if (href) return /^https?:/.test(href) ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
