import { useEffect } from "react";
import { SidebarNav } from "./Sidebar";

/** Slide-over navigation for viewports below the `lg` sidebar breakpoint. */
export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Close on Escape, and don't let the page behind scroll while it's open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-45 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 dark:bg-black/65 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* The panel stays mounted so it can animate out, but it only claims the
          dialog role while open; a permanently-present aria-modal element
          confuses assistive tech and any tooling that looks for a live dialog. */}
      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? "true" : undefined}
        aria-label="Documentation navigation"
        className={`absolute top-0 left-0 h-full w-[min(19rem,85vw)] overflow-y-auto border-r border-[var(--border)] bg-[var(--bg)] px-3 pt-[calc(var(--header-h)+1rem)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>
  );
}
