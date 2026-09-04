/**
 * Client-side search over the bundled markdown.
 *
 * The whole corpus is a few hundred KB of text, so it ships with the app and
 * queries run synchronously: no index server, no network round trip, and it
 * works offline. Documents are split into heading-scoped sections so a hit can
 * deep-link to the exact anchor rather than the top of a long page.
 */

import { docs } from "./content";
import { createSlugger } from "./slug";
import { stripInlineMarkdown, stripNonContent, toPlainText } from "./markdown-text";

export type SearchSection = {
  docSlug: string;
  docTitle: string;
  group: string;
  /** Heading text for the section, or the page title for the lead section. */
  heading: string;
  /** Anchor id, empty for the lead section. */
  anchorId: string;
  body: string;
  /** Lowercased haystacks, precomputed once. */
  headingLower: string;
  bodyLower: string;
  docTitleLower: string;
};

export type SearchResult = {
  section: SearchSection;
  score: number;
  /** Body excerpt around the best match, with the query terms marked. */
  snippet: Array<{ text: string; match: boolean }>;
};

function buildSections(groupOf: Map<string, string>): SearchSection[] {
  const sections: SearchSection[] = [];

  for (const doc of docs) {
    const slugger = createSlugger();
    const group = groupOf.get(doc.slug) ?? "";

    let heading = doc.title;
    let anchorId = "";
    let buffer: string[] = [];

    const flush = () => {
      const body = toPlainText(buffer.join("\n"));
      buffer = [];
      if (!body && !heading) return;
      sections.push({
        docSlug: doc.slug,
        docTitle: doc.title,
        group,
        heading,
        anchorId,
        body,
        headingLower: heading.toLowerCase(),
        bodyLower: body.toLowerCase(),
        docTitleLower: doc.title.toLowerCase(),
      });
    };

    for (const line of stripNonContent(doc.content).split(/\r?\n/)) {
      const match = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (!match) {
        buffer.push(line);
        continue;
      }

      const depth = match[1].length;
      const text = stripInlineMarkdown(match[2]);
      const id = slugger(text);

      // h1 is the page title; keep accumulating into the lead section.
      if (depth === 1) continue;

      flush();
      heading = text;
      anchorId = id;
    }

    flush();
  }

  return sections;
}

let sectionsCache: SearchSection[] | null = null;

export function getSections(groupOf: Map<string, string>): SearchSection[] {
  if (!sectionsCache) sectionsCache = buildSections(groupOf);
  return sectionsCache;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9/_.-]+/)
    .filter((token) => token.length > 0);
}

/** Whole-word-ish match scores higher than a mid-word substring. */
function scoreIn(haystack: string, token: string): number {
  const index = haystack.indexOf(token);
  if (index === -1) return 0;

  const before = index === 0 ? "" : haystack[index - 1];
  const after = haystack[index + token.length] ?? "";
  const atWordStart = index === 0 || /[^a-z0-9]/.test(before);
  const atWordEnd = after === "" || /[^a-z0-9]/.test(after);

  if (atWordStart && atWordEnd) return 1;
  if (atWordStart) return 0.7;
  return 0.4;
}

const SNIPPET_RADIUS = 90;

function buildSnippet(body: string, tokens: string[]): SearchResult["snippet"] {
  if (!body) return [];

  const lower = body.toLowerCase();
  let anchor = -1;
  for (const token of tokens) {
    const index = lower.indexOf(token);
    if (index !== -1 && (anchor === -1 || index < anchor)) anchor = index;
  }

  let start = 0;
  let end = Math.min(body.length, SNIPPET_RADIUS * 2);
  if (anchor !== -1) {
    start = Math.max(0, anchor - SNIPPET_RADIUS);
    end = Math.min(body.length, anchor + SNIPPET_RADIUS);
    // Don't cut mid-word at the head.
    if (start > 0) {
      const space = body.indexOf(" ", start);
      if (space !== -1 && space < start + 20) start = space + 1;
    }
  }

  const excerpt =
    (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");

  // Split the excerpt on every token occurrence so the UI can bold matches.
  const pattern = tokens
    .filter(Boolean)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!pattern) return [{ text: excerpt, match: false }];

  const parts: SearchResult["snippet"] = [];
  const regex = new RegExp(`(${pattern})`, "gi");
  let cursor = 0;
  for (const match of excerpt.matchAll(regex)) {
    const index = match.index!;
    if (index > cursor) parts.push({ text: excerpt.slice(cursor, index), match: false });
    parts.push({ text: match[0], match: true });
    cursor = index + match[0].length;
  }
  if (cursor < excerpt.length) parts.push({ text: excerpt.slice(cursor), match: false });

  return parts;
}

export function search(
  query: string,
  sections: SearchSection[],
  limit = 12,
): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const section of sections) {
    let score = 0;
    let matchedTokens = 0;

    for (const token of tokens) {
      const inTitle = scoreIn(section.docTitleLower, token);
      const inHeading = scoreIn(section.headingLower, token);
      const inBody = scoreIn(section.bodyLower, token);

      const tokenScore = inTitle * 10 + inHeading * 6 + inBody * 2;
      if (tokenScore > 0) matchedTokens += 1;
      score += tokenScore;
    }

    // Require every token to land somewhere; AND semantics keep multi-word
    // queries from drowning in pages that only match the common word.
    if (matchedTokens < tokens.length) continue;

    // Nudge the lead section of a page up: it's the page itself.
    if (!section.anchorId) score += 1.5;
    // Exact phrase match is a strong signal.
    const phrase = tokens.join(" ");
    if (tokens.length > 1) {
      if (section.headingLower.includes(phrase)) score += 8;
      else if (section.bodyLower.includes(phrase)) score += 4;
    }

    results.push({
      section,
      score,
      snippet: buildSnippet(section.body, tokens),
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
