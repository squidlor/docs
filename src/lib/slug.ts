/**
 * github-slugger-compatible heading ids.
 *
 * Must match rehype-slug exactly, or the on-this-page links point at anchors
 * that don't exist. rehype-slug delegates to github-slugger, which lowercases,
 * strips punctuation (keeping `-` and `_`), turns whitespace into hyphens, and
 * suffixes `-1`, `-2`, … for repeats within a single document.
 *
 * Note it does NOT collapse runs of hyphens: "Product 1 & Squidlor" becomes
 * "product-1--squidlor", because the ampersand is removed and both surrounding
 * spaces still become hyphens.
 */

const PUNCTUATION =
  /[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~ ]/g;

export function slugify(text: string): string {
  return text.trim().toLowerCase().replace(PUNCTUATION, "").replace(/\s/g, "-");
}

/** Per-document slugger that reproduces github-slugger's collision suffixes. */
export function createSlugger() {
  const seen = new Map<string, number>();

  return (text: string): string => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}
