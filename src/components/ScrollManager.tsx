import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Owns scroll position across client-side navigations.
 *
 * react-router deliberately doesn't do this: a new path should start at the
 * top, and a `#hash` should land on its anchor, but the anchor may not be
 * measurable on the first frame, since web fonts and syntax highlighting both
 * reflow the article after mount. So a hash target is retried for a few frames
 * before giving up.
 */
export function ScrollManager() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      return;
    }

    const id = decodeURIComponent(hash.slice(1));
    let attempts = 0;
    let frame = 0;

    const tryScroll = () => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
        // A focus target makes the jump land for keyboard and screen readers too.
        element.setAttribute("tabindex", "-1");
        element.focus({ preventScroll: true });
        return;
      }
      if (attempts++ < 20) frame = requestAnimationFrame(tryScroll);
    };

    frame = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(frame);
    // `key` changes even when clicking the same hash twice, so repeat jumps work.
  }, [pathname, hash, key]);

  return null;
}
