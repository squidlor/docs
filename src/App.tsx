import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { ThemeProvider } from "@/lib/theme";
import { brokenNavLinks, orphanedDocs } from "@/lib/nav";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { SearchDialog } from "@/components/SearchDialog";
import { ScrollManager } from "@/components/ScrollManager";
import { SiteFooter } from "@/components/SiteFooter";
import { DocPage } from "@/pages/DocPage";

function isMacPlatform(): boolean {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform ?? "");
}

function Shell() {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMac = useMemo(isMacPlatform, []);

  const openSearch = useCallback(() => {
    setMobileNavOpen(false);
    setSearchOpen(true);
  }, []);

  // ⌘K / Ctrl-K anywhere, plus "/" when not already typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Accept either modifier rather than gating on the detected platform:
      // platform sniffing is unreliable, and a wrong guess would make the
      // shortcut silently dead. `isMac` only decides which hint we display.
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }

      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (isTyping) return;

      event.preventDefault();
      openSearch();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMac, openSearch]);

  // Any navigation dismisses the drawer, including browser back/forward.
  useEffect(() => setMobileNavOpen(false), [pathname]);

  return (
    <>
      {/* Keyboard users can jump the nav rails straight to the article. */}
      <a
        href="#doc-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--accent-fg)]"
      >
        Skip to content
      </a>

      <TopBar
        isMac={isMac}
        onOpenSearch={openSearch}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
      />

      <div className="mx-auto flex max-w-[110rem]">
        <Sidebar />
        <main id="doc-content" className="flex min-w-0 flex-1 flex-col">
          <Routes>
            <Route path="*" element={<DocPage />} />
          </Routes>
          <SiteFooter />
        </main>
      </div>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ScrollManager />
    </>
  );
}

export default function App() {
  // Content/nav drift is a build-time authoring mistake; surface it loudly in
  // dev rather than letting a page quietly disappear from the sidebar.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (orphanedDocs.length > 0) {
      console.warn("[docs] content files missing from nav:", orphanedDocs);
    }
    if (brokenNavLinks.length > 0) {
      console.warn("[docs] nav entries with no content file:", brokenNavLinks);
    }
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ThemeProvider>
  );
}
