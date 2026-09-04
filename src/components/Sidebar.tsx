import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  Activity,
  Bot,
  BookOpen,
  ChevronRight,
  Code2,
  FileCode2,
  HelpCircle,
  Network,
  Plug,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { nav } from "@/lib/nav";
import { normalizeSlug } from "@/lib/content";

const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  activity: Activity,
  trending: TrendingUp,
  code: Code2,
  filecode: FileCode2,
  plug: Plug,
  bot: Bot,
  network: Network,
  help: HelpCircle,
};

function groupContains(groupIndex: number, pathname: string): boolean {
  const current = normalizeSlug(pathname);
  return nav[groupIndex].items.some((item) => normalizeSlug(item.slug) === current);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  // The group holding the current page is always open; others remember the
  // reader's own expand/collapse choices.
  const activeGroup = useMemo(
    () => nav.findIndex((_, index) => groupContains(index, pathname)),
    [pathname],
  );

  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  // On a fresh load (or a deep link), scroll the active item into view; long
  // sidebars otherwise open scrolled to the top with no visible selection.
  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Documentation" className="pb-16">
      {nav.map((group, groupIndex) => {
        const Icon = ICONS[group.icon] ?? BookOpen;
        const isActiveGroup = groupIndex === activeGroup;
        const isOpen = isActiveGroup || !collapsed[groupIndex];

        return (
          <div key={group.title} className="mb-1">
            <button
              type="button"
              onClick={() =>
                setCollapsed((previous) => ({
                  ...previous,
                  [groupIndex]: !collapsed[groupIndex],
                }))
              }
              aria-expanded={isOpen}
              className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Icon
                strokeWidth={2}
                className="h-[0.9rem] w-[0.9rem] shrink-0 text-[var(--fg-subtle)] transition-colors group-hover:text-[var(--accent)]"
              />
              <span className="font-display flex-1 text-[0.7rem] font-semibold tracking-[0.06em] text-[var(--fg-muted)] uppercase">
                {group.title}
              </span>
              <ChevronRight
                strokeWidth={2.25}
                className={`h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)] transition-transform duration-200 ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            </button>

            {isOpen && (
              <ul className="mt-0.5 ml-[1.1rem] border-l border-[var(--border)] pl-2">
                {group.items.map((item) => {
                  const isActive = normalizeSlug(item.slug) === normalizeSlug(pathname);
                  return (
                    <li key={item.slug}>
                      <NavLink
                        to={item.slug}
                        ref={isActive ? activeLinkRef : undefined}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative -ml-2 flex items-center gap-2 rounded-md py-[0.3rem] pr-2 pl-3 text-[0.845rem] transition-colors ${
                          isActive
                            ? "bg-[var(--bg-active)] font-medium text-[var(--accent)]"
                            : "text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
                        }`}
                      >
                        {/* Overlays the parent's border to mark the active row. */}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1/2 -left-[0.51rem] h-[1.15rem] w-[1.5px] -translate-y-1/2 rounded-full bg-[var(--accent)]"
                          />
                        )}
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <span className="shrink-0 rounded-full border border-[var(--border-strong)] px-1.5 py-px text-[0.6rem] font-medium tracking-wide text-[var(--fg-subtle)] uppercase">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Desktop rail: sticky, independently scrollable, hidden under lg. */
export function Sidebar() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[var(--header-h)] h-[calc(100vh-var(--header-h))] w-[var(--sidebar-w)] overflow-y-auto border-r border-[var(--border)] px-3 pt-6">
        <SidebarNav />
      </div>
    </aside>
  );
}
