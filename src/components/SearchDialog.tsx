import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CornerDownLeft, FileText, Hash, Search as SearchIcon, X } from "lucide-react";
import { flatNav } from "@/lib/nav";
import { getSections, search, type SearchResult } from "@/lib/search";

/** slug -> nav group title, so results can show where a page lives. */
const groupOf = new Map(flatNav.map((item) => [item.slug, item.group]));

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SearchDialog({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  // Sections are built once, on first open, so the cost isn't paid at boot.
  const sections = useMemo(() => (open ? getSections(groupOf) : []), [open]);
  const results = useMemo(
    () => (open ? search(query, sections) : []),
    [open, query, sections],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    // Autofocus after the dialog paints.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  // Lock background scroll while the dialog owns the viewport.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keep the highlighted row visible during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const go = (result: SearchResult) => {
    const { docSlug, anchorId } = result.section;
    navigate(anchorId ? `${docSlug}#${anchorId}` : docSlug);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((index) =>
        results.length === 0 ? 0 : (index - 1 + results.length) % results.length,
      );
      return;
    }
    if (event.key === "Enter" && results[selected]) {
      event.preventDefault();
      go(results[selected]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      /* Distinct from the trigger buttons' "Search documentation" label, so the
         dialog and the control that opens it aren't announced identically. */
      aria-label="Site search"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] dark:bg-black/65"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-lg)]"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
          <SearchIcon
            strokeWidth={2}
            className="h-[1.05rem] w-[1.05rem] shrink-0 text-[var(--fg-subtle)]"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the docs…"
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent py-3.5 text-[0.95rem] text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
          >
            <X strokeWidth={2.25} className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.trim() === "" ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--fg-subtle)]">
              Search page titles, headings, and body text.
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--fg-subtle)]">
              No results for “{query.trim()}”.
            </p>
          ) : (
            <ul ref={listRef} className="p-2">
              {results.map((result, index) => {
                const { section } = result;
                const isSection = Boolean(section.anchorId);
                const Icon = isSection ? Hash : FileText;
                const isSelected = index === selected;

                return (
                  <li key={`${section.docSlug}#${section.anchorId}`}>
                    <button
                      type="button"
                      data-index={index}
                      onClick={() => go(result)}
                      onMouseMove={() => setSelected(index)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-[var(--bg-active)]" : "hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      <Icon
                        strokeWidth={2}
                        className={`mt-[0.2rem] h-4 w-4 shrink-0 ${
                          isSelected ? "text-[var(--accent)]" : "text-[var(--fg-subtle)]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-1.5">
                          <span
                            className={`text-[0.9rem] font-medium ${
                              isSelected ? "text-[var(--accent)]" : "text-[var(--fg)]"
                            }`}
                          >
                            {isSection ? section.heading : section.docTitle}
                          </span>
                          <span className="text-[0.7rem] text-[var(--fg-subtle)]">
                            {/* Overview pages often share their group's name —
                                don't print "AI & Agents · AI & agents". */}
                            {[
                              section.group,
                              isSection &&
                              section.docTitle.toLowerCase() !==
                                section.group.toLowerCase()
                                ? section.docTitle
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        {result.snippet.length > 0 && (
                          <span className="mt-0.5 line-clamp-2 block text-[0.8rem] leading-relaxed text-[var(--fg-muted)]">
                            {result.snippet.map((part, partIndex) =>
                              part.match ? (
                                <mark
                                  key={partIndex}
                                  className="rounded bg-transparent font-semibold text-[var(--accent)]"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <span key={partIndex}>{part.text}</span>
                              ),
                            )}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <CornerDownLeft
                          strokeWidth={2}
                          className="mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)]"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-[var(--border)] px-4 py-2 text-[0.7rem] text-[var(--fg-subtle)] sm:flex">
          <ShortcutHint keys={["↑", "↓"]} label="Navigate" />
          <ShortcutHint keys={["↵"]} label="Open" />
          <ShortcutHint keys={["Esc"]} label="Close" />
          {results.length > 0 && (
            <span className="ml-auto">
              {results.length} result{results.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <kbd
          key={key}
          className="font-mono min-w-[1.25rem] rounded border border-[var(--border-strong)] bg-[var(--bg-sunken)] px-1 text-center text-[0.65rem] leading-[1.15rem]"
        >
          {key}
        </kbd>
      ))}
      {label}
    </span>
  );
}
