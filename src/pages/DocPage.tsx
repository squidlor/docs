import { useEffect } from "react";
import { useLocation } from "react-router";
import { getDoc } from "@/lib/content";
import { getNavContext } from "@/lib/nav";
import { Markdown } from "@/components/Markdown";
import { TableOfContents } from "@/components/TableOfContents";
import { Breadcrumbs, PrevNext } from "@/components/PageNav";
import { NotFound } from "./NotFound";

const SITE_NAME = "Squidlor Docs";

export function DocPage() {
  const { pathname } = useLocation();
  const doc = getDoc(pathname);
  const { current, previous, next } = getNavContext(pathname);

  useEffect(() => {
    document.title = doc ? `${doc.title} · ${SITE_NAME}` : `Not found · ${SITE_NAME}`;

    const description = doc?.description;
    if (!description) return;
    const meta = document.querySelector('meta[name="description"]');
    const original = meta?.getAttribute("content");
    meta?.setAttribute("content", description);
    return () => {
      if (meta && original) meta.setAttribute("content", original);
    };
  }, [doc]);

  if (!doc) return <NotFound />;

  return (
    <div className="flex min-w-0 flex-1 justify-center gap-10 px-5 pt-8 pb-20 sm:px-8 xl:gap-14">
      <article className="min-w-0 max-w-[46rem] flex-1">
        <Breadcrumbs group={current?.group} title={doc.title} />

        <header className="mb-8">
          <h1 className="font-display text-[2.25rem] leading-[1.15] font-bold tracking-[-0.035em] text-[var(--fg)]">
            {doc.title}
          </h1>
          {doc.description && (
            <p className="mt-3 text-[1.05rem] leading-relaxed text-[var(--fg-muted)]">
              {doc.description}
            </p>
          )}
        </header>

        <Markdown content={doc.content} slug={doc.slug} />

        <PrevNext previous={previous} next={next} />
      </article>

      {doc.headings.length >= 2 && (
        <aside className="hidden w-[var(--toc-w)] shrink-0 xl:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100vh-var(--header-h)-4rem)] overflow-y-auto">
            <TableOfContents headings={doc.headings} />
          </div>
        </aside>
      )}
    </div>
  );
}
