import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Bot,
  BookOpen,
  Code2,
  Coins,
  Database,
  FileCode2,
  Gauge,
  Layers,
  Network,
  Plug,
  Rocket,
  ShieldCheck,
  Terminal,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  blocks: Blocks,
  book: BookOpen,
  bot: Bot,
  code: Code2,
  coins: Coins,
  database: Database,
  filecode: FileCode2,
  gauge: Gauge,
  layers: Layers,
  network: Network,
  plug: Plug,
  rocket: Rocket,
  shield: ShieldCheck,
  terminal: Terminal,
  trending: TrendingUp,
  zap: Zap,
};

export type Card = {
  title: string;
  description?: string;
  href: string;
  icon?: string;
};

const isExternal = (href: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");

/**
 * Card navigation for overview pages, the docs equivalent of GitBook's card
 * blocks. Authored in markdown as a ```cards fence holding a JSON array, which
 * keeps the content files plain markdown with no JSX or raw HTML.
 */
export function CardGrid({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="my-7 grid gap-3 sm:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon ? (ICONS[card.icon] ?? Layers) : null;
        const external = isExternal(card.href);

        const body = (
          <>
            <span className="flex items-start justify-between gap-3">
              {Icon && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--accent)] transition-colors group-hover:border-[var(--accent)]">
                  <Icon strokeWidth={2} className="h-[0.95rem] w-[0.95rem]" />
                </span>
              )}
              {external ? (
                <ArrowUpRight
                  strokeWidth={2.25}
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)] transition-all group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-[var(--accent)]"
                />
              ) : (
                <ArrowRight
                  strokeWidth={2.25}
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                />
              )}
            </span>
            <span className="font-display mt-3 block text-[0.95rem] font-semibold text-[var(--fg)] transition-colors group-hover:text-[var(--accent)]">
              {card.title}
            </span>
            {card.description && (
              <span className="mt-1 block text-[0.83rem] leading-relaxed text-[var(--fg-muted)]">
                {card.description}
              </span>
            )}
          </>
        );

        const className =
          "group block rounded-xl border border-[var(--border)] p-4 no-underline transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]";

        return external ? (
          <a
            key={card.href + card.title}
            href={card.href}
            target="_blank"
            rel="noreferrer"
            className={className}
          >
            {body}
          </a>
        ) : (
          <Link key={card.href + card.title} to={card.href} className={className}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}
