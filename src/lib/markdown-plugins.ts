/**
 * remark plugins for the docs' markdown extensions.
 *
 * Hand-rolled tree walking instead of unist-util-visit: the transforms are
 * shallow (top-level blockquotes, paragraph text) and this keeps the dependency
 * surface to react-markdown plus the two rehype plugins.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type Node = {
  type: string;
  value?: string;
  children?: Node[];
  data?: Record<string, any>;
  [key: string]: any;
};

const CALLOUT_KINDS: Record<string, { kind: string; label: string }> = {
  NOTE: { kind: "info", label: "Note" },
  INFO: { kind: "info", label: "Info" },
  TIP: { kind: "success", label: "Tip" },
  SUCCESS: { kind: "success", label: "Success" },
  IMPORTANT: { kind: "info", label: "Important" },
  WARNING: { kind: "warning", label: "Warning" },
  CAUTION: { kind: "danger", label: "Caution" },
  DANGER: { kind: "danger", label: "Danger" },
};

/**
 * `[!KIND]`, an optional same-line title, then the rest of the paragraph.
 *
 * Scoped to the first line on purpose: remark merges every line of a blockquote
 * paragraph into one text node, so a greedy `(.*)` with `\s*` in front would
 * swallow the newline and promote the whole first sentence of the body into the
 * title.
 */
const MARKER = /^\[!([A-Za-z]+)\][ \t]*([^\r\n]*)(?:\r?\n([\s\S]*))?$/;

function walk(node: Node, visit: (node: Node, parent: Node | null) => void, parent: Node | null = null) {
  visit(node, parent);
  if (!node.children) return;
  // Snapshot: visitors may replace children in place.
  for (const child of [...node.children]) walk(child, visit, node);
}

/**
 * Turns GitHub-style alert blockquotes into callout containers:
 *
 *   > [!WARNING]
 *   > Rotate the key before mainnet.
 *
 * becomes a <div class="callout callout-warning"> with a styled title row.
 * An optional custom title can follow the marker: `> [!NOTE] Heads up`.
 */
export function remarkCallouts() {
  return (tree: Node) => {
    walk(tree, (node) => {
      if (node.type !== "blockquote" || !node.children?.length) return;

      const [firstBlock] = node.children;
      if (firstBlock.type !== "paragraph" || !firstBlock.children?.length) return;

      const [firstInline] = firstBlock.children;
      if (firstInline.type !== "text" || typeof firstInline.value !== "string") return;

      const match = MARKER.exec(firstInline.value.replace(/^[ \t]+/, ""));
      if (!match) return;

      const spec = CALLOUT_KINDS[match[1].toUpperCase()];
      if (!spec) return;

      // Text on the marker's own line is a custom title; everything from the
      // next line on is body and has to survive.
      const customTitle = match[2].trim();
      firstInline.value = match[3] ?? "";

      // A paragraph left with nothing but whitespace would render as an empty
      // line above the body; remove it.
      const firstBlockIsEmpty =
        firstBlock.children.every(
          (child) => child.type === "text" && !child.value?.trim(),
        ) || firstBlock.children.length === 0;
      if (firstBlockIsEmpty) node.children.shift();

      node.data = {
        ...node.data,
        hName: "div",
        hProperties: { className: ["callout", `callout-${spec.kind}`] },
      };

      node.children.unshift({
        type: "paragraph",
        data: { hName: "p", hProperties: { className: ["callout-title"] } },
        children: [{ type: "text", value: customTitle || spec.label }],
      });
    });
  };
}

/**
 * Rewrites links between source files so copied-in markdown stays clickable.
 *
 * Authors reference sibling pages the way the files sit on disk
 * (`./architecture.md`, `../api/feeds.md`); readers need route paths. Anchors
 * and absolute/external URLs pass through untouched.
 */
export function remarkRelativeLinks({ slug }: { slug: string }) {
  const baseSegments = slug === "/" ? [] : slug.slice(1).split("/").slice(0, -1);

  return (tree: Node) => {
    walk(tree, (node) => {
      if (node.type !== "link" || typeof node.url !== "string") return;

      const url: string = node.url;
      if (
        url.startsWith("#") ||
        url.startsWith("/") ||
        /^[a-z][a-z0-9+.-]*:/i.test(url) ||
        url.startsWith("//")
      ) {
        return;
      }

      const [path, hash] = url.split("#");
      if (!path.endsWith(".md")) return;

      const segments = [...baseSegments];
      for (const segment of path.replace(/\.md$/, "").split("/")) {
        if (segment === "." || segment === "") continue;
        if (segment === "..") segments.pop();
        else segments.push(segment);
      }

      // index.md is the folder's own page.
      if (segments[segments.length - 1] === "index") segments.pop();

      node.url = `/${segments.join("/")}${hash ? `#${hash}` : ""}`;
    });
  };
}

const GITBOOK_HINT_STYLES: Record<string, string> = {
  info: "[!NOTE]",
  success: "[!TIP]",
  warning: "[!WARNING]",
  danger: "[!CAUTION]",
};

/**
 * Normalizes GitBook's `{% hint %}` blocks into the `> [!NOTE]` syntax that
 * remarkCallouts understands, and drops any other `{% … %}` tags.
 *
 * The hint body isn't blockquoted in GitBook source, so every line has to be
 * prefixed on the way out; a plain tag-for-tag substitution would leave the
 * body as an ordinary paragraph outside the callout.
 */
export function stripGitbookTags(markdown: string): string {
  return markdown
    .replace(
      /^[ \t]*\{%\s*hint\s+style=["']?(\w+)["']?\s*%\}[ \t]*\r?\n([\s\S]*?)^[ \t]*\{%\s*endhint\s*%\}[ \t]*$/gim,
      (_match, style: string, body: string) => {
        const marker = GITBOOK_HINT_STYLES[style.toLowerCase()] ?? "[!NOTE]";
        const quoted = body
          .replace(/\s+$/, "")
          .split(/\r?\n/)
          .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
          .join("\n");
        return `> ${marker}\n${quoted}`;
      },
    )
    .replace(/\{%[^%]*%\}/g, "");
}
