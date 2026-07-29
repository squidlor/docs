import { ArrowUpRight, Menu, Search as SearchIcon, X } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const EXTERNAL_LINKS = [
  { label: "App", href: "https://app.squidlor.com" },
  { label: "Website", href: "https://squidlor.com" },
];

type Props = {
  onOpenSearch: () => void;
  onToggleMobileNav: () => void;
  mobileNavOpen: boolean;
  /** True once ⌘K has been detected as the platform shortcut. */
  isMac: boolean;
};

export function TopBar({
  onOpenSearch,
  onToggleMobileNav,
  mobileNavOpen,
  isMac,
}: Props) {
  return (
    <header className="sticky top-0 z-40 h-[var(--header-h)] border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[110rem] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileNavOpen}
          className="-ml-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] lg:hidden"
        >
          {mobileNavOpen ? (
            <X strokeWidth={2.25} className="h-[1.15rem] w-[1.15rem]" />
          ) : (
            <Menu strokeWidth={2.25} className="h-[1.15rem] w-[1.15rem]" />
          )}
        </button>

        <Logo />

        {/* Search sits in the middle on desktop, collapses to an icon on mobile. */}
        <div className="ml-auto flex min-w-0 flex-1 justify-end lg:ml-6 lg:justify-start">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search documentation"
            className="hidden w-full max-w-sm items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-[0.42rem] text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] sm:flex"
          >
            <SearchIcon
              strokeWidth={2}
              className="h-[0.95rem] w-[0.95rem] shrink-0 text-[var(--fg-subtle)]"
            />
            <span className="flex-1 truncate text-[0.85rem] text-[var(--fg-subtle)]">
              Search docs…
            </span>
            <kbd className="font-mono shrink-0 rounded border border-[var(--border-strong)] bg-[var(--bg-raised)] px-1.5 py-px text-[0.65rem] text-[var(--fg-subtle)]">
              {isMac ? "⌘" : "Ctrl "}K
            </kbd>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search documentation"
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] sm:hidden"
          >
            <SearchIcon strokeWidth={2} className="h-[1.05rem] w-[1.05rem]" />
          </button>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Squidlor links">
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[0.85rem] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
            >
              {link.label}
              <ArrowUpRight
                strokeWidth={2.25}
                className="h-3 w-3 opacity-50 transition-transform group-hover:translate-x-px group-hover:-translate-y-px group-hover:opacity-100"
              />
            </a>
          ))}
        </nav>

        <div className="ml-1 shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
