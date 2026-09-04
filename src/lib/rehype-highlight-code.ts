/**
 * Syntax highlighting via lowlight, with our own language set.
 *
 * Replaces rehype-highlight, which statically imports lowlight's `common`
 * bundle (~40 grammars) at module scope; its `languages` option adds to that
 * set but can't shrink it, so the unused grammars ship either way. Driving
 * lowlight directly means the bundle contains exactly the languages listed in
 * lib/languages and nothing else.
 */

import { createLowlight } from "lowlight";
import { toString } from "hast-util-to-string";
import { languages } from "./languages";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Element = {
  type: string;
  tagName?: string;
  properties?: Record<string, any>;
  children?: Element[];
  [key: string]: any;
};

const lowlight = createLowlight(languages);

function classNames(node: Element): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/);
  return [];
}

function languageOf(node: Element): string | undefined {
  for (const name of classNames(node)) {
    if (name.startsWith("language-")) return name.slice("language-".length);
    // Some authoring tools emit `lang-x` instead.
    if (name.startsWith("lang-")) return name.slice("lang-".length);
  }
  return undefined;
}

export function rehypeHighlightCode() {
  return (tree: Element) => {
    const walk = (node: Element, parent: Element | null) => {
      if (node.type === "element" && node.tagName === "code" && parent?.tagName === "pre") {
        highlight(node);
        // Highlighted children are terminal; no need to descend further.
        return;
      }
      for (const child of node.children ?? []) walk(child, node);
    };

    walk(tree, null);
  };
}

function highlight(node: Element) {
  const language = languageOf(node);

  // ```cards and other non-code fences are handled by the renderer; leaving
  // them untouched lets it read the original text back out.
  if (!language || !lowlight.registered(language)) return;

  let result;
  try {
    result = lowlight.highlight(language, toString(node as any));
  } catch {
    // A grammar that chokes on odd input should still render as plain code.
    return;
  }

  node.properties = {
    ...node.properties,
    className: [...new Set([...classNames(node), "hljs", `language-${language}`])],
  };
  node.children = result.children as unknown as Element[];
}
