import { useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Link } from "react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { ArrowUpRight, Link2 } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { CardGrid, type Card } from "./CardGrid";
import {
  remarkCallouts,
  remarkRelativeLinks,
  stripGitbookTags,
} from "@/lib/markdown-plugins";
import { rehypeHighlightCode } from "@/lib/rehype-highlight-code";
import { stripComments } from "@/lib/markdown-text";

/** Adds the hover-revealed "#" permalink next to a rendered heading. */
function HeadingAnchor({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <a href={`#${id}`} className="heading-anchor" aria-label="Permalink to this section">
      <Link2 strokeWidth={2} className="h-[0.85em] w-[0.85em]" />
    </a>
  );
}

function heading(Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  return function Heading({ id, children, ...rest }: ComponentPropsWithoutRef<"h2">) {
    return (
      <Tag id={id} {...rest}>
        <HeadingAnchor id={id} />
        {children}
      </Tag>
    );
  };
}

const isExternal = (href: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");

/** Flattens a react-markdown child tree back to its source text. */
function toText(node: ReactNode): string {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  const element = node as { props?: { children?: ReactNode } };
  return element.props ? toText(element.props.children) : "";
}

function parseCards(source: string): Card[] | null {
  try {
    const parsed: unknown = JSON.parse(source);
    if (!Array.isArray(parsed)) return null;
    const cards = parsed.filter(
      (item): item is Card =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Card).title === "string" &&
        typeof (item as Card).href === "string",
    );
    return cards.length > 0 ? cards : null;
  } catch {
    // Malformed JSON falls through to a normal code block, which makes the
    // authoring mistake visible on the page instead of blanking the section.
    return null;
  }
}

const components: Components = {
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  h5: heading("h5"),
  h6: heading("h6"),

  a({ href, children, ...rest }) {
    const target = href ?? "";

    if (target.startsWith("#") || target === "") {
      return (
        <a href={target} {...rest}>
          {children}
        </a>
      );
    }

    if (isExternal(target)) {
      return (
        <a
          href={target}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-baseline gap-0.5"
          {...rest}
        >
          {children}
          <ArrowUpRight
            strokeWidth={2.5}
            aria-hidden="true"
            className="h-[0.7em] w-[0.7em] shrink-0 self-center opacity-60"
          />
        </a>
      );
    }

    // Internal: let the router handle it so navigation stays client-side.
    return <Link to={target}>{children}</Link>;
  },

  // react-markdown hands <pre> the highlighted <code> element as its child;
  // the language class rides on that child.
  pre({ children }) {
    const child = children as
      | { props?: { className?: string; children?: ReactNode } }
      | undefined;
    const className = child?.props?.className ?? "";
    const language = /language-([\w-]+)/.exec(className)?.[1];

    // ```cards fences are navigation, not code; see CardGrid.
    if (language === "cards") {
      const cards = parseCards(toText(child?.props?.children));
      if (cards) return <CardGrid cards={cards} />;
    }

    return <CodeBlock language={language}>{children}</CodeBlock>;
  },

  // Wide tables scroll inside their own container rather than the page.
  table({ children, ...rest }) {
    return (
      <div className="my-6 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table {...rest}>{children}</table>
      </div>
    );
  },
};

const REHYPE_PLUGINS = [rehypeSlug, rehypeHighlightCode];

export function Markdown({ content, slug }: { content: string; slug: string }) {
  // Comments are removed from the source string rather than filtered out of the
  // parsed tree. remark hands `<!-- … -->` through as an html node and, without
  // rehype-raw, react-markdown renders it as literal text, so a block shelved
  // with comments would show up verbatim on the page. Stripping pre-parse also
  // matches how search and heading extraction treat comments, which keeps a
  // shelved section invisible in all three places rather than just one.
  const source = useMemo(
    () => stripGitbookTags(stripComments(content)),
    [content],
  );
  const remarkPlugins = useMemo(
    () => [remarkGfm, remarkCallouts, [remarkRelativeLinks, { slug }] as const],
    [slug],
  );

  return (
    <div className="prose">
      <ReactMarkdown
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remarkPlugins={remarkPlugins as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={REHYPE_PLUGINS as any}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
