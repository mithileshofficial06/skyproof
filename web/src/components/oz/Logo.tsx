// SkyProof lockup in the ozky style: icon + wordmark in currentColor; tone drives contrast.
import { cx } from "../ui";

const TONE = { dark: "text-ink", light: "text-grey", gold: "text-gold" } as const;

export function OzMark({ size = 26 }: { size?: number }) {
  return (
    <svg height={size} width={size} viewBox="0 0 32 32" fill="none" aria-hidden className="block">
      <g stroke="currentColor" strokeWidth="2.6">
        <circle cx="8" cy="8" r="5" />
        <circle cx="24" cy="8" r="5" />
        <circle cx="8" cy="24" r="5" />
        <circle cx="24" cy="24" r="5" />
        <path d="M11.5 11.5 L20.5 20.5 M20.5 11.5 L11.5 20.5" />
      </g>
      <rect x="12.5" y="12.5" width="7" height="7" fill="currentColor" />
    </svg>
  );
}

export function OzLogo({ size = 26, tone = "dark", wordmark = true }: { size?: number; tone?: keyof typeof TONE; wordmark?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5 align-middle transition-colors duration-500 ease-in-out", TONE[tone])}>
      <OzMark size={size} />
      {wordmark && (
        <span className="font-display font-semibold tracking-[-0.03em]" style={{ fontSize: size * 0.78 }}>
          SkyProof
        </span>
      )}
    </span>
  );
}
