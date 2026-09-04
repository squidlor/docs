import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import type { DocHeading } from "@/lib/content";

/**
 * Tracks which heading the reader is currently under.
 *
 * Uses scroll position rather than IntersectionObserver: observers report when
 * an element crosses a boundary, which gets ambiguous with short sections that
 * are all on screen at once. "Last heading above the read line" is
 * unambiguous, and cheap when throttled to one rAF per scroll burst.
 */
function useActiveHeading(headings: DocHeading[]): string {
  const [active, setActive] = useState("");
  const { pathname } = useLocation();

  useEffect(() => {
    if (headings.length === 0) {
      setActive("");
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;

      const headerHeight =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
        ) * 16 || 60;
      const readLine = headerHeight + 80;

      // Near the bottom nothing new can scroll past the read line, so pin to
      // the last heading; otherwise the final section never highlights.
      const scrollBottom = window.scrollY + window.innerHeight;
      if (scrollBottom >= document.documentElement.scrollHeight - 24) {
        setActive(headings[headings.length - 1].id);
        return;
      }

      let current = "";
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= readLine) current = heading.id;
        else break;
      }

      // Above the first heading: highlight nothing rather than guessing.
      setActive(current);
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings, pathname]);

  return active;
}

export function TableOfContents({ headings }: { headings: DocHeading[] }) {
  const active = useActiveHeading(headings);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-[0.8rem]">
      <p className="font-display mb-2.5 text-[0.7rem] font-semibold tracking-[0.06em] text-[var(--fg-muted)] uppercase">
        On this page
      </p>
      <ul className="border-l border-[var(--border)]">
        {headings.map((heading) => {
          const isActive = heading.id === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`-ml-px block border-l py-[0.3rem] transition-colors ${
                  heading.depth === 3 ? "pl-6" : "pl-3"
                } ${
                  isActive
                    ? "border-[var(--accent)] font-medium text-[var(--accent)]"
                    : "border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
