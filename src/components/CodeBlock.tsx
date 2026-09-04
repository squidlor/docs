import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  console: "Shell",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  json: "JSON",
  jsonc: "JSON",
  sol: "Solidity",
  solidity: "Solidity",
  py: "Python",
  python: "Python",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  http: "HTTP",
  graphql: "GraphQL",
  sql: "SQL",
  text: "",
  plaintext: "",
};

/**
 * Wraps a highlighted <pre> with a language label and copy button.
 *
 * The copied text is read off the rendered DOM rather than from the markdown
 * AST: by this point rehype-highlight has split the source into spans, and the
 * DOM's textContent is the faithful reassembly of it.
 */
export function CodeBlock({
  language,
  children,
}: {
  language?: string;
  children: ReactNode;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const text = preRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Insecure context or denied permission; fall back to a hidden textarea.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      } finally {
        document.body.removeChild(textarea);
      }
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }, []);

  const label = language ? (LANGUAGE_LABELS[language] ?? language.toUpperCase()) : "";

  // A header bar rather than controls floating over the code: a long single line
  // scrolls *under* an absolutely-positioned label instead of being pushed by
  // padding, so on narrow viewports the label always ends up mid-statement.
  // Keeping the copy button here also makes it reachable on touch, where there
  // is no hover to reveal it.
  return (
    <div className="code-block my-6 overflow-hidden rounded-[0.625rem] border border-[var(--code-border)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--code-border)] bg-[var(--bg-sunken)] py-1 pr-1 pl-3">
        <span className="font-mono text-[0.65rem] tracking-wide text-[var(--fg-subtle)] uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[0.7rem] text-[var(--fg-subtle)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
        >
          {copied ? (
            <>
              <Check strokeWidth={2.5} className="h-3 w-3 text-[var(--accent)]" />
              <span className="text-[var(--accent)]">Copied</span>
            </>
          ) : (
            <>
              <Copy strokeWidth={2} className="h-3 w-3" />
              <span className="sr-only sm:not-sr-only">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}
