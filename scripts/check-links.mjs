/**
 * Validates every internal link and anchor in the docs content, plus nav↔content
 * agreement. Mirrors the app's slug + heading-id derivation so a pass here means
 * the rendered site has no dead internal links.
 *
 * Two authoring mechanisms it has to understand:
 *
 *  - `hidden: true` frontmatter unpublishes a page. A published page linking to
 *    a hidden one is an error (readers hit a 404), but a hidden page's own links
 *    are still checked, so it stays correct for whenever it comes back.
 *  - HTML comments shelve a block in place. They're invisible to readers, so
 *    links and headings inside them are excluded from checking entirely.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const NAV_FILE = join(ROOT, "src/lib/nav.ts");

const PUNCTUATION =
  /[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~ ]/g;

const slugify = (text) =>
  text.trim().toLowerCase().replace(PUNCTUATION, "").replace(/\s/g, "-");

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory()
      ? walk(full)
      : full.endsWith(".md")
        ? [full]
        : [];
  });
}

function stripFrontmatter(source) {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(source);
  return m ? source.slice(m[0].length) : source;
}

/** Blanks HTML comments, preserving line count (mirrors stripComments in the app). */
function stripComments(md) {
  return md.replace(/<!--[\s\S]*?-->/g, (m) => "\n".repeat((m.match(/\n/g) ?? []).length));
}

function stripFences(md) {
  const out = [];
  let fence = null;
  for (const line of md.split(/\r?\n/)) {
    const f = /^\s{0,3}(```+|~~~+)/.exec(line);
    if (f) {
      if (fence === null) {
        fence = f[1];
        out.push("");
        continue;
      }
      if (f[1][0] === fence[0] && f[1].length >= fence.length) {
        fence = null;
        out.push("");
        continue;
      }
    }
    out.push(fence === null ? line : "");
  }
  return out.join("\n");
}

const stripInline = (t) =>
  t
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/<[^>]+>/g, "")
    .trim();

const files = walk(CONTENT).sort();
const docs = new Map(); // slug -> { anchors:Set, file, hidden }

for (const file of files) {
  const rel = relative(CONTENT, file);
  const slug =
    "/" + rel.replace(/\.md$/, "").replace(/(^|\/)index$/, "").replace(/\/$/, "");
  const normalized = slug === "/" || slug === "" ? "/" : slug;

  const raw = readFileSync(file, "utf8");
  const hidden = /^---[\s\S]*?^hidden:\s*true\b/m.test(raw);
  const body = stripComments(stripFrontmatter(raw));
  const anchors = new Set();
  const seen = new Map();

  // The app lifts a leading H1 into the page header before rendering, so it
  // never produces an anchor — match that here.
  const lines = stripFences(body).split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const leadingH1 = /^\s{0,3}#\s+/.test(lines[i] ?? "");
  const startAt = leadingH1 ? i + 1 : 0;

  for (const line of lines.slice(startAt)) {
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const base = slugify(stripInline(m[2]));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    anchors.add(n === 0 ? base : `${base}-${n}`);
  }

  docs.set(normalized, { anchors, file: rel, hidden });
}

const problems = [];

// --- Link checking -----------------------------------------------------------
for (const file of files) {
  const rel = relative(CONTENT, file);
  const body = stripComments(stripFrontmatter(readFileSync(file, "utf8")));
  const selfSlug =
    "/" + rel.replace(/\.md$/, "").replace(/(^|\/)index$/, "").replace(/\/$/, "");
  const self = selfSlug === "/" || selfSlug === "" ? "/" : selfSlug;

  // Markdown links outside code fences, plus hrefs inside ```cards blocks.
  const scanTargets = [];
  for (const m of stripFences(body).matchAll(/\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    scanTargets.push(m[1]);
  }
  for (const block of body.matchAll(/```cards\s*([\s\S]*?)```/g)) {
    for (const h of block[1].matchAll(/"href"\s*:\s*"([^"]+)"/g)) {
      scanTargets.push(h[1]);
    }
  }

  for (const target of scanTargets) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) continue;

    const [path, hash] = target.split("#");
    const resolved = path === "" ? self : path;

    if (!resolved.startsWith("/")) {
      problems.push(`${rel}: relative link not resolvable -> ${target}`);
      continue;
    }

    const key = resolved === "/" ? "/" : resolved.replace(/\/$/, "");
    const doc = docs.get(key);
    if (!doc) {
      problems.push(`${rel}: dead link -> ${target} (no page ${key})`);
      continue;
    }
    // A published page must not link into an unpublished one.
    if (doc.hidden && !docs.get(self)?.hidden) {
      problems.push(`${rel}: links to hidden page -> ${target} (${doc.file} has hidden: true)`);
      continue;
    }
    if (hash && !doc.anchors.has(hash)) {
      problems.push(`${rel}: dead anchor -> ${target} (no #${hash} in ${doc.file})`);
    }
  }
}

// --- Internal routes hardcoded in components ---------------------------------
// The site chrome (footer columns, empty states) links to routes in TSX rather
// than markdown. Those links are invisible to a content-only scan, which is how
// a footer link to a removed page survived a "no dead links" pass.
const SRC = join(ROOT, "src");
const IGNORED_PREFIXES = ["/assets/", "/favicon", "/_"];

function walkSource(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walkSource(full);
    return /\.(tsx?|jsx?)$/.test(entry) ? [full] : [];
  });
}

for (const file of walkSource(SRC)) {
  const rel = relative(ROOT, file);
  const source = readFileSync(file, "utf8");

  // `href: "/x"`, `href="/x"`, `to="/x"`, `to={"/x"}`, `slug: "/x"`.
  const targets = new Set(
    [...source.matchAll(/(?:href|to|slug)\s*[:=]\s*\{?\s*["'](\/[^"'`]*)["']/g)].map(
      (m) => m[1],
    ),
  );

  for (const target of targets) {
    if (IGNORED_PREFIXES.some((prefix) => target.startsWith(prefix))) continue;

    const [path, hash] = target.split("#");
    const key = path === "/" ? "/" : path.replace(/\/$/, "");
    const doc = docs.get(key);

    if (!doc) {
      problems.push(`${rel}: dead route -> ${target} (no page ${key})`);
      continue;
    }
    if (doc.hidden) {
      problems.push(`${rel}: routes to hidden page -> ${target} (${doc.file})`);
      continue;
    }
    if (hash && !doc.anchors.has(hash)) {
      problems.push(`${rel}: dead anchor -> ${target} (no #${hash} in ${doc.file})`);
    }
  }
}

// --- Nav agreement -----------------------------------------------------------
// Commented-out nav entries are shelved, not active — strip JS comments before
// reading slugs, or a `// { slug: "/markets" }` line still counts as published.
const nav = readFileSync(NAV_FILE, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");
const navSlugs = [...nav.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

for (const slug of navSlugs) {
  if (!docs.has(slug)) problems.push(`nav.ts: entry has no content file -> ${slug}`);
}
for (const [slug, doc] of docs) {
  if (doc.hidden) {
    if (navSlugs.includes(slug)) {
      problems.push(`nav.ts lists a hidden page -> ${slug} (${doc.file} has hidden: true)`);
    }
    continue; // Hidden pages are meant to be out of nav.
  }
  if (!navSlugs.includes(slug)) {
    problems.push(`content orphaned (not in nav) -> ${doc.file}`);
  }
}

// --- Report ------------------------------------------------------------------
const hiddenCount = [...docs.values()].filter((d) => d.hidden).length;
console.log(
  `pages: ${docs.size - hiddenCount} published, ${hiddenCount} hidden   nav entries: ${navSlugs.length}`,
);
if (problems.length === 0) {
  console.log("OK — no dead links, anchors, or nav drift");
} else {
  console.log(`\n${problems.length} problem(s):\n`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
