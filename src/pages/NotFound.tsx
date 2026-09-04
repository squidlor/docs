import { Link, useLocation } from "react-router";
import { ArrowRight, FileQuestion } from "lucide-react";
import { flatNav } from "@/lib/nav";
import { getSections, search } from "@/lib/search";

const groupOf = new Map(flatNav.map((item) => [item.slug, item.group]));

export function NotFound() {
  const { pathname } = useLocation();

  // Treat the URL itself as a query; a mistyped or moved path usually still
  // contains the words the reader wanted.
  const query = pathname.replace(/[/_-]+/g, " ").trim();
  const suggestions = query ? search(query, getSections(groupOf), 5) : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start px-5 pt-20 pb-24 sm:px-8">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-subtle)]">
        <FileQuestion strokeWidth={1.75} className="h-5 w-5" />
      </span>

      <h1 className="font-display mt-5 text-[2rem] leading-tight font-bold tracking-[-0.03em]">
        Page not found
      </h1>
      <p className="mt-2 text-[var(--fg-muted)]">
        Nothing is published at{" "}
        <code className="font-mono rounded border border-[var(--code-border)] bg-[var(--code-bg)] px-1.5 py-0.5 text-[0.85em]">
          {pathname}
        </code>
        .
      </p>

      {suggestions.length > 0 && (
        <div className="mt-9 w-full">
          <p className="font-display mb-2.5 text-[0.7rem] font-semibold tracking-[0.06em] text-[var(--fg-muted)] uppercase">
            Did you mean
          </p>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
            {suggestions.map(({ section }) => (
              <li key={`${section.docSlug}#${section.anchorId}`}>
                <Link
                  to={section.anchorId ? `${section.docSlug}#${section.anchorId}` : section.docSlug}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.925rem] font-medium text-[var(--fg)] transition-colors group-hover:text-[var(--accent)]">
                      {section.anchorId ? section.heading : section.docTitle}
                    </span>
                    <span className="block truncate text-[0.75rem] text-[var(--fg-subtle)]">
                      {section.group}
                      {section.anchorId ? ` · ${section.docTitle}` : ""}
                    </span>
                  </span>
                  <ArrowRight
                    strokeWidth={2}
                    className="h-4 w-4 shrink-0 text-[var(--fg-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to="/"
        className="mt-9 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[0.9rem] font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-90"
      >
        Back to the docs home
        <ArrowRight strokeWidth={2.25} className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
