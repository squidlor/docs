import { Link } from "react-router";
import { LogoMark } from "./Logo";

const LINK_COLUMNS = [
  {
    title: "Products",
    links: [
      { label: "Oracle", href: "/oracle" },
      { label: "Price feeds", href: "/oracle/feeds" },
      { label: "API reference", href: "/api" },
      { label: "Oracle Chat", href: "/ai/oracle-chat" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Quick start", href: "/quick-start" },
      { label: "Smart contracts", href: "/contracts" },
      { label: "Integration guides", href: "/integration/reading-prices" },
      { label: "Deployed addresses", href: "/networks/addresses" },
    ],
  },
  {
    title: "Squidlor",
    links: [
      { label: "Website", href: "https://squidlor.com", external: true },
      { label: "App", href: "https://app.squidlor.com", external: true },
      { label: "Admin", href: "https://admin.squidlor.com", external: true },
      { label: "API", href: "https://api.squidlor.com", external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-9 lg:flex-row lg:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <LogoMark className="h-[1.15rem] w-[1.15rem]" />
            <span className="font-display text-[0.9rem] font-bold tracking-tight">
              Squidlor
            </span>
          </div>
          <p className="mt-2.5 text-[0.8rem] leading-relaxed text-[var(--fg-subtle)]">
            The self-owned, multi-source oracle data layer for crypto and tokenized equities.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-14">
          {LINK_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="font-display mb-2.5 text-[0.7rem] font-semibold tracking-[0.06em] text-[var(--fg-muted)] uppercase">
                {column.title}
              </p>
              <ul className="space-y-1.5">
                {column.links.map((link) => {
                  const className =
                    "text-[0.8rem] text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]";
                  const external = "external" in link && link.external;
                  return (
                    <li key={link.href}>
                      {external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className={className}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.href} className={className}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-9 border-t border-[var(--border)] pt-5 text-[0.75rem] text-[var(--fg-subtle)]">
        © {new Date().getFullYear()} Squidlor. Documentation for the Squidlor oracle stack.
      </p>
    </footer>
  );
}
