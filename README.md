# Squidlor Docs

The documentation site for [docs.squidlor.com](https://docs.squidlor.com), a GitBook-style
docs app with light and dark themes, client-side search, and content authored as plain markdown.

React 19 + Vite 7 + Tailwind 4, matching the `landing/` stack.

## Running it

```bash
npm install
npm run dev        # → http://localhost:3100
npm run build      # dep-check, link-check, typecheck, then build to dist/
npm run check-deps
npm run check-links
npm run preview
```

Netlify builds this site with **pnpm**, which does not hoist transitive dependencies the way
npm does. A package imported by `src/` but missing from `package.json` therefore resolves
locally and fails the deploy. `npm run check-deps` catches that before the build, and
`pnpm install --frozen-lockfile && npm run build` in a clean checkout reproduces what Netlify
runs. Keep `pnpm-lock.yaml` updated alongside `package-lock.json` when you change a dependency.

## Writing content

Everything readable on the site is a markdown file under [`content/`](./content). The file
path is the URL:

| File | Route |
| --- | --- |
| `content/index.md` | `/` |
| `content/quick-start.md` | `/quick-start` |
| `content/oracle/index.md` | `/oracle` |
| `content/oracle/architecture.md` | `/oracle/architecture` |

### Frontmatter

```markdown
---
title: Consumer interface
description: One or two sentences. Shown under the page title, used as the meta description, and indexed for search.
---

Body starts here. Don't repeat the title as an H1; the page header renders it.
```

`title` and `description` are the only fields the app reads. If `title` is omitted, a leading
`# Heading` is used, then the filename.

### Navigation

[`src/lib/nav.ts`](./src/lib/nav.ts) is the table of contents, the equivalent of GitBook's
`SUMMARY.md`. It is the single source of ordering for the sidebar, the previous/next footer,
and breadcrumbs.

A new page needs an entry there. `npm run check-links` fails on a nav entry with no file, or a
file missing from nav, so the two can't drift silently.

```typescript
{
  title: "Squidlor Oracle",
  icon: "activity",              // key into ICONS in src/components/Sidebar.tsx
  items: [
    { title: "Overview", slug: "/oracle" },
    { title: "Resolver oracles", slug: "/oracle/resolver-oracles", badge: "Soon" },
  ],
}
```

### Shelving content

Two mechanisms for content that exists but shouldn't be published yet. Both are reversible
and both are enforced by `check-links`.

**A whole page**: add `hidden: true` to its frontmatter and comment out its `nav.ts` entry:

```markdown
---
title: Some unreleased feature
hidden: true # shelved, not launching yet; remove this line to publish
---
```

A hidden page is not routable (the URL renders the not-found page), is excluded from search,
and is expected to be absent from nav. `check-links` fails if a published page links to a
hidden one, or if `nav.ts` still lists one.

**A block inside a published page**: wrap it in an HTML comment:

```markdown
<!-- Shelved, not announced yet.
| **some-repo** | Contracts that aren't public yet. |
-->
```

Comments are stripped from the source *before* parsing, so a shelved block is invisible on the
page, in search, and in the on-this-page rail. Note this is not react-markdown's default
behaviour; without the strip, remark passes comments through as literal text and they render
verbatim. See `stripComments` in [`src/lib/markdown-text.ts`](./src/lib/markdown-text.ts).

Nothing is shelved right now. Mark shelved blocks with a consistent phrase so
`grep -rn 'Shelved' content` finds every site when it's time to restore them.

### Callouts

GitHub-style alert syntax. `NOTE`, `INFO`, `TIP`, `SUCCESS`, `IMPORTANT`, `WARNING`, `CAUTION`,
and `DANGER` are recognized:

```markdown
> [!WARNING]
> The equity aggregators read Chainlink alone today.

> [!NOTE] Custom title
> Text after the marker on the same line becomes the callout's title.
```

GitBook's `{% hint style="info" %}` blocks are converted automatically, so content pasted from
GitBook works without editing.

### Card grids

A ```` ```cards ```` fence holding a JSON array. Used on overview pages for navigation:

````markdown
```cards
[
  {
    "title": "Quick start",
    "description": "Read a price in about five minutes.",
    "href": "/quick-start",
    "icon": "rocket"
  }
]
```
````

Icon names are the keys of `ICONS` in [`src/components/CardGrid.tsx`](./src/components/CardGrid.tsx).
External `href` values get an outbound arrow; internal ones route client-side.

### Links

Absolute paths (`/oracle/architecture`) are preferred. Relative `.md` links
(`./architecture.md`, `../api/feeds.md`) are rewritten to routes at render time, so markdown
copied from another repo keeps working.

`npm run check-links` validates every internal link **and** every `#anchor` against the actual
heading IDs, so a renamed heading can't leave a dead deep link behind.

### Code blocks

Registered languages are listed in [`src/lib/languages.ts`](./src/lib/languages.ts): Solidity,
TypeScript, JS, JSON, bash, Python, YAML, TOML/INI, HTTP, XML, diff, and plaintext. Adding one
is an import plus a map entry.

Only those grammars are bundled, which is why the app drives lowlight directly instead of using
`rehype-highlight` (whose default import pulls in ~40 grammars regardless of configuration).

## How it fits together

```text
content/**/*.md
      │  import.meta.glob (eager, raw)
      ▼
src/lib/content.ts      frontmatter, slugs, heading extraction, plain text
      │
      ├──► src/lib/nav.ts        ordering, prev/next, drift detection
      ├──► src/lib/search.ts     heading-scoped sections + scoring
      └──► src/components/Markdown.tsx
                 remark-gfm, remarkCallouts, remarkRelativeLinks
                 rehype-slug, rehypeHighlightCode
```

Notable details:

- **Heading IDs are github-slugger-compatible** ([`src/lib/slug.ts`](./src/lib/slug.ts)) so the
  on-this-page rail's links match what `rehype-slug` renders. The slugger is deliberately not
  "cleaned up"; it does not collapse runs of hyphens, because `rehype-slug` doesn't either.
- **Search ships with the app.** The corpus is a few hundred KB, so queries run synchronously
  with no index server and work offline. Results deep-link to the matching heading.
- **Theme is applied before first paint** by an inline script in `index.html`, so there is no
  flash of the wrong theme. An explicit choice persists in `localStorage`; otherwise the OS
  preference is followed live.
- **All colors route through semantic CSS variables** defined in
  [`src/styles/global.css`](./src/styles/global.css) (`--bg`, `--fg`, `--border`, `--accent`, …).
  Components read those, never raw palette values, so the two themes stay in sync.

## Deploying

Static output: build and serve `dist/`.

```bash
npm run build
rsync -avz --delete dist/ <user>@<docs-host>:/var/www/docs.squidlor.com/
```

An nginx server block is in [`deploy/nginx-docs.squidlor.com.conf`](./deploy/nginx-docs.squidlor.com.conf).
It handles the SPA fallback (every unknown path serves `index.html`), caches hashed assets
immutably, and never caches `index.html`.

TLS via certbot, as with the api and admin hosts:

```bash
certbot --nginx -d docs.squidlor.com
```

For platform hosts (Netlify, Vercel, Cloudflare Pages), `public/_redirects` already provides the
SPA fallback: build command `npm run build`, publish directory `dist`.

> The site is fully static and reads no Squidlor API at runtime, so it has no backend
> dependency and cannot break when a service is down.
