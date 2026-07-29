import { parseFrontmatter } from "./frontmatter";
import { createSlugger } from "./slug";
import { stripInlineMarkdown, stripNonContent, toPlainText } from "./markdown-text";

export type DocHeading = {
  id: string;
  text: string;
  depth: number;
};

export type Doc = {
  /** Route path, e.g. "/oracle/architecture". Root page is "/". */
  slug: string;
  /** Source file, relative to content/ — shown in "edit this page". */
  sourcePath: string;
  title: string;
  description?: string;
  tags: string[];
  /** Markdown body, frontmatter stripped and the leading H1 lifted into
   *  `title` so the page header can own the title and description block. */
  content: string;
  /** h2/h3 headings, for the on-this-page rail. */
  headings: DocHeading[];
  /** Plain-text body, for search. */
  text: string;
  /**
   * `hidden: true` in frontmatter unpublishes a page without deleting it: it
   * stops being routable, drops out of search, and is exempt from the nav
   * cross-check. Used to shelve a section that isn't ready to announce —
   * restoring it is one line of frontmatter plus its nav entry.
   */
  hidden: boolean;
};

const modules = import.meta.glob("../../content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** "../../content/oracle/architecture.md" -> "oracle/architecture.md" */
function toRelativePath(globKey: string): string {
  return globKey.replace(/^.*?\/content\//, "");
}

/** "oracle/index.md" -> "/oracle"; "index.md" -> "/" */
function toSlug(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.md$/, "");
  const withoutIndex = withoutExt.replace(/(^|\/)index$/, "");
  return withoutIndex === "" ? "/" : `/${withoutIndex}`;
}

function extractHeadings(markdown: string, slugger: (text: string) => string) {
  const headings: DocHeading[] = [];

  for (const line of stripNonContent(markdown).split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const depth = match[1].length;
    const text = stripInlineMarkdown(match[2]);
    if (!text) continue;

    // Every heading consumes a slug so collision suffixes stay in step with
    // rehype-slug, but only h2/h3 surface in the rail.
    const id = slugger(text);
    if (depth >= 2 && depth <= 3) headings.push({ id, text, depth });
  }

  return headings;
}


/**
 * Lifts a leading `# Title` out of the body.
 *
 * The page header renders the title and description together, so leaving the H1
 * in the markdown would either duplicate it or push the description above it.
 * Only a title in the first non-blank position is taken — an H1 further down is
 * real content.
 */
function splitLeadingTitle(markdown: string): { title?: string; body: string } {
  const lines = markdown.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") index += 1;

  const match = /^\s{0,3}#\s+(.*?)\s*#*\s*$/.exec(lines[index] ?? "");
  if (!match) return { body: markdown };

  const rest = lines.slice(index + 1);
  while (rest.length > 0 && rest[0].trim() === "") rest.shift();

  return { title: stripInlineMarkdown(match[1]), body: rest.join("\n") };
}

function buildDoc(globKey: string, raw: string): Doc {
  const sourcePath = toRelativePath(globKey);
  const slug = toSlug(sourcePath);
  const { data, content } = parseFrontmatter(raw);
  const { title: inlineTitle, body } = splitLeadingTitle(content);

  const fallbackTitle = sourcePath
    .replace(/\.md$/, "")
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    slug,
    sourcePath,
    title:
      (typeof data.title === "string" && data.title) || inlineTitle || fallbackTitle,
    description:
      typeof data.description === "string" ? data.description : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    content: body,
    // Headings come from the same string that gets rendered, so the TOC's
    // collision suffixes stay in lockstep with rehype-slug's.
    headings: extractHeadings(body, createSlugger()),
    text: toPlainText(body),
    hidden: data.hidden === true,
  };
}

/** Every parsed file, including hidden ones — the authoring view. */
export const allDocs: Doc[] = Object.entries(modules)
  .map(([key, raw]) => buildDoc(key, raw))
  .sort((a, b) => a.slug.localeCompare(b.slug));

/** What the site actually publishes. Nav, search, and routing all use this. */
export const docs: Doc[] = allDocs.filter((doc) => !doc.hidden);

const bySlug = new Map(docs.map((doc) => [doc.slug, doc]));

export function getDoc(slug: string): Doc | undefined {
  return bySlug.get(normalizeSlug(slug));
}

/** Tolerates trailing slashes and missing leading slash. */
export function normalizeSlug(slug: string): string {
  const trimmed = slug.replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
