/**
 * Markdown → plain text, for headings, search snippets, and descriptions.
 *
 * Shared by the content pipeline and the search index so the two can't drift:
 * a heading extracted one way and searched another produces anchors that don't
 * match what's rendered.
 */

/**
 * Blanks out fenced code blocks, preserving line count.
 *
 * Keeps `# comment` lines in a bash sample out of the table of contents, and
 * keeps code out of search snippets, where it reads as noise.
 */
export function stripCodeBlocks(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let fence: string | null = null;

  for (const line of lines) {
    const fenceMatch = /^\s{0,3}(```+|~~~+)/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) {
        fence = marker;
        out.push("");
        continue;
      }
      if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
        out.push("");
        continue;
      }
    }
    out.push(fence === null ? line : "");
  }

  return out.join("\n");
}

/**
 * Blanks out HTML comments, preserving line count.
 *
 * Needed by anything that scans document *structure* line by line. The renderer
 * never displays a comment, so a commented-out `## Section` is invisible on the
 * page — but a heading scanner would still see it and put a phantom entry in the
 * on-this-page rail pointing at an anchor that was never rendered.
 */
export function stripComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, (match) =>
    "\n".repeat((match.match(/\n/g) ?? []).length),
  );
}

/**
 * Code blocks and comments removed together — the usual preprocessing for any
 * structural scan (headings, search sections).
 */
export function stripNonContent(markdown: string): string {
  return stripComments(stripCodeBlocks(markdown));
}

/**
 * Emphasis delimiters, stripped conservatively.
 *
 * `*` is safe to treat as emphasis anywhere. `_` is not: identifiers like
 * `get_audit_trail` and `max_staleness` are pervasive in these docs, and a
 * naive `_(.*?)_` turns them into `getaudittrail`. So underscore emphasis is
 * only recognized when the delimiters sit against a non-word boundary, which
 * is also how CommonMark treats intra-word underscores.
 */
function stripEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, "$1$2")
    .replace(/(^|[^\w`])__(.+?)__(?![\w`])/g, "$1$2")
    .replace(/(^|[^\w`])_(?!\s)([^_]+?)_(?![\w`])/g, "$1$2");
}

/** Inline markdown syntax → readable text. */
export function stripInlineMarkdown(text: string): string {
  return stripEmphasis(
    text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

/**
 * Whole-document plain text, for search bodies.
 *
 * Callout markers (`[!WARNING]`) are dropped rather than kept: they're
 * presentation, and leaving them in means a snippet reads
 * "…into MongoDB. [!WARNING] All three require…".
 */
export function toPlainText(markdown: string): string {
  return stripCodeBlocks(markdown)
    // Whole comments first, spanning lines. The renderer drops HTML nodes, so
    // commented-out prose is invisible on the page — but stripping tags
    // line-by-line further down would leave a multi-line comment's *body*
    // behind, silently indexing shelved content into search.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/\[!([A-Za-z]+)\]/g, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/^\s*[-:\s]+$/gm, "")
    .split(/\r?\n/)
    .map((line) => stripInlineMarkdown(line))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
