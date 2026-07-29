import { Link } from "react-router";

/** The squid mark from the marketing site, recolored to the current accent. */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 35 38"
      fill="none"
      aria-hidden="true"
      className={`text-[var(--accent)] ${className}`}
    >
      <g stroke="currentColor" strokeLinecap="round">
        <path
          d="M16.8564 2.73828C20.6587 2.73831 24.6767 6.79023 24.6768 13.0723C24.6768 19.3543 20.6587 23.4062 16.8564 23.4062C13.0542 23.4062 9.03516 19.3544 9.03516 13.0723C9.0352 6.79021 13.0542 2.73828 16.8564 2.73828Z"
          strokeWidth="5.4774"
        />
        <path d="M17.1953 26.4268L17.1953 35.4201" strokeWidth="4.57391" />
        <path
          d="M10.8711 21.6836C10.5417 23.6738 8.36391 27.3805 2.28795 26.2849"
          strokeWidth="4.57391"
        />
        <path
          d="M23.5195 21.6836C23.8489 23.6738 26.0267 27.3805 32.1027 26.2849"
          strokeWidth="4.57391"
        />
        <path
          d="M14.0898 25.0713C13.7604 27.0615 9.83215 35.2582 3.75619 34.1626"
          strokeWidth="4.57391"
        />
        <path
          d="M20.3008 25.0713C20.6302 27.0615 24.5585 35.2582 30.6344 34.1626"
          strokeWidth="4.57391"
        />
      </g>
    </svg>
  );
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
