import { Link } from "react-router";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { NavItem } from "@/lib/nav";

export function Breadcrumbs({ group, title }: { group?: string; title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[0.78rem]">
      <Link
        to="/"
        className="text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
      >
        Docs
      </Link>
      {group && (
        <>
          <ChevronRight
            strokeWidth={2.5}
            aria-hidden="true"
            className="h-3 w-3 text-[var(--fg-subtle)] opacity-60"
          />
          <span className="text-[var(--fg-subtle)]">{group}</span>
        </>
      )}
      <ChevronRight
        strokeWidth={2.5}
        aria-hidden="true"
        className="h-3 w-3 text-[var(--fg-subtle)] opacity-60"
      />
      <span className="truncate font-medium text-[var(--fg-muted)]">{title}</span>
    </nav>
  );
}

export function PrevNext({
  previous,
  next,
}: {
  previous?: NavItem;
  next?: NavItem;
}) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Previous and next page"
      className="mt-16 grid gap-3 border-t border-[var(--border)] pt-8 sm:grid-cols-2"
    >
      {previous ? (
        <Link
          to={previous.slug}
          className="group flex flex-col gap-1 rounded-xl border border-[var(--border)] px-4 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
        >
          <span className="flex items-center gap-1.5 text-[0.7rem] tracking-wide text-[var(--fg-subtle)] uppercase">
            <ArrowLeft
              strokeWidth={2.25}
              className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
            />
            Previous
          </span>
          <span className="font-display text-[0.925rem] font-medium text-[var(--fg)] transition-colors group-hover:text-[var(--accent)]">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}

      {next && (
        <Link
          to={next.slug}
          className="group flex flex-col gap-1 rounded-xl border border-[var(--border)] px-4 py-3 text-right transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1.5 text-[0.7rem] tracking-wide text-[var(--fg-subtle)] uppercase">
            Next
            <ArrowRight
              strokeWidth={2.25}
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            />
          </span>
          <span className="font-display text-[0.925rem] font-medium text-[var(--fg)] transition-colors group-hover:text-[var(--accent)]">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}
