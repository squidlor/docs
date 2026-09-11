/**
 * The site's table of contents: the equivalent of GitBook's SUMMARY.md.
 *
 * This is the single source of ordering: the sidebar, the previous/next footer,
 * and breadcrumbs all derive from it. A markdown file under content/ that isn't
 * listed here is still routable but won't appear in navigation (dev builds warn
 * about it; see `orphanedDocs`).
 */

import { docs, normalizeSlug } from "./content";

export type NavItem = {
  title: string;
  slug: string;
  /** Small pill after the label, e.g. "Soon" or "Beta". */
  badge?: string;
};

export type NavGroup = {
  title: string;
  /** Key into ICONS in the sidebar component. */
  icon: string;
  items: NavItem[];
};

export const nav: NavGroup[] = [
  {
    title: "Introduction",
    icon: "book",
    items: [
      { title: "Welcome", slug: "/" },
      { title: "Quick start", slug: "/quick-start" },
      { title: "Core concepts", slug: "/concepts" },
      { title: "System architecture", slug: "/architecture" },
    ],
  },
  {
    title: "Products",
    icon: "trending",
    items: [
      { title: "Overview", slug: "/products" },
      { title: "Hub", slug: "/products/hub" },
      { title: "Prediction markets", slug: "/products/markets" },
      { title: "Stock-paired tokens", slug: "/products/trade" },
      { title: "Clippers", slug: "/products/clippers" },
    ],
  },
  {
    title: "Squidlor Oracle",
    icon: "activity",
    items: [
      { title: "Overview", slug: "/oracle" },
      { title: "Aggregation architecture", slug: "/oracle/architecture" },
      { title: "Consumer interface", slug: "/oracle/interface" },
      { title: "Price feeds & assets", slug: "/oracle/feeds" },
      { title: "Resolver oracles", slug: "/oracle/resolver-oracles", badge: "Pilot" },
      { title: "How it compares", slug: "/oracle/comparison" },
      { title: "Measured performance", slug: "/oracle/evidence" },
    ],
  },
  {
    title: "Build with Squidlor",
    icon: "rocket",
    items: [
      { title: "Overview", slug: "/build" },
      { title: "Authentication", slug: "/build/authentication" },
      { title: "Rate limits & plans", slug: "/build/rate-limits" },
      { title: "Agent quickstart", slug: "/build/quickstart-agents" },
      { title: "Contract quickstart", slug: "/build/quickstart-contracts" },
      { title: "Data quickstart", slug: "/build/quickstart-data" },
      { title: "Templates", slug: "/build/templates" },
      { title: "Showcase", slug: "/build/showcase" },
      { title: "Builder rewards", slug: "/build/rewards" },
      { title: "Bounties", slug: "/build/bounties" },
      { title: "Rewards terms", slug: "/build/rewards-terms" },
      { title: "Changelog", slug: "/build/changelog" },
    ],
  },
  {
    title: "API Reference",
    icon: "code",
    items: [
      { title: "Overview", slug: "/api" },
      { title: "Feeds", slug: "/api/feeds" },
      { title: "Realtime prices", slug: "/api/realtime" },
      { title: "History & OHLC", slug: "/api/history" },
      { title: "Daily prices", slug: "/api/daily" },
      { title: "Scorecards & proofs", slug: "/api/providers" },
      { title: "Events", slug: "/api/events" },
      { title: "Randomness", slug: "/api/randomness" },
      { title: "Errors & limits", slug: "/api/errors" },
    ],
  },
  {
    title: "Smart Contracts",
    icon: "filecode",
    items: [
      { title: "Overview", slug: "/contracts" },
      { title: "SquidlorAdapterV2", slug: "/contracts/adapter" },
      { title: "SquidPriceFeed", slug: "/contracts/price-feed" },
      { title: "Oracle aggregator", slug: "/contracts/aggregator" },
      { title: "Aggregator registry", slug: "/contracts/registry" },
      { title: "Security properties", slug: "/contracts/security" },
    ],
  },
  {
    title: "Integration",
    icon: "plug",
    items: [
      { title: "Read prices on-chain", slug: "/integration/reading-prices" },
      { title: "Read prices off-chain", slug: "/integration/reading-offchain" },
      { title: "Push price updates", slug: "/integration/sending-updates" },
      { title: "Oracle SDK", slug: "/integration/sdk" },
    ],
  },
  {
    title: "AI & Agents",
    icon: "bot",
    items: [
      { title: "Overview", slug: "/ai" },
      { title: "Oracle Chat", slug: "/ai/oracle-chat" },
      { title: "MCP server", slug: "/ai/mcp" },
    ],
  },
  {
    title: "Networks",
    icon: "network",
    items: [
      { title: "Supported networks", slug: "/networks" },
      { title: "Base", slug: "/networks/base" },
      { title: "Robinhood Chain", slug: "/networks/robinhood-chain" },
      { title: "Deployed addresses", slug: "/networks/addresses" },
      { title: "Bring Squidlor to your chain", slug: "/networks/for-chains" },
    ],
  },
  {
    title: "Resources",
    icon: "help",
    items: [
      { title: "Trust model", slug: "/resources/trust-model" },
      { title: "Roadmap", slug: "/resources/roadmap" },
      { title: "FAQ", slug: "/resources/faq" },
    ],
  },
];

/** Reading order, used for previous/next. */
export const flatNav: Array<NavItem & { group: string }> = nav.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
);

const navIndex = new Map(flatNav.map((item, i) => [normalizeSlug(item.slug), i]));

export function getNavContext(slug: string) {
  const index = navIndex.get(normalizeSlug(slug));
  if (index === undefined) {
    return { current: undefined, previous: undefined, next: undefined };
  }
  return {
    current: flatNav[index],
    previous: index > 0 ? flatNav[index - 1] : undefined,
    next: index < flatNav.length - 1 ? flatNav[index + 1] : undefined,
  };
}

/** Content files missing from `nav`, surfaced as a console warning in dev. */
export const orphanedDocs = docs
  .filter((doc) => !navIndex.has(doc.slug))
  .map((doc) => doc.sourcePath);

/** Nav entries with no backing content file. */
export const brokenNavLinks = flatNav
  .filter((item) => !docs.some((doc) => doc.slug === normalizeSlug(item.slug)))
  .map((item) => item.slug);
