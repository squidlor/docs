import { Link } from "react-router";

/**
 * The deck's octopus mark, shared byte-for-byte with every other Squidlor surface.
 * It is a violet PNG with its own shading rather than a tinted glyph, so it reads
 * correctly against both the light and dark docs themes without a per-theme variant.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return <img src="/squidlor-mark.png" alt="" aria-hidden="true" className={className} />;
}

export function Logo() {
  return (
    <Link
      to="/"
      className="group flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-2 transition-opacity hover:opacity-80"
      aria-label="Squidlor documentation home"
    >
      <LogoMark className="h-[1.35rem] w-[1.35rem]" />
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-[0.975rem] leading-none font-bold tracking-tight text-[var(--fg)]">
          Squidlor
        </span>
        <span className="font-display text-[0.975rem] leading-none font-normal text-[var(--fg-subtle)]">
          Docs
        </span>
      </span>
    </Link>
  );
}
