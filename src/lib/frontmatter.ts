/**
 * Minimal YAML-frontmatter reader.
 *
 * Deliberately not gray-matter: that pulls a full YAML parser (and Buffer
 * shims) into the browser bundle for what our pages actually use — flat
 * `key: value` pairs plus the occasional inline `[a, b]` list.
 */

export type Frontmatter = {
  title?: string;
  description?: string;
  tags?: string[];
  hidden?: boolean;
  [key: string]: unknown;
};

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Removes a trailing `# comment` from an unquoted scalar.
 *
 * YAML allows one, and `hidden: true # shelved for now` is a natural way to
 * record *why* a flag is set. Without this, the value parses as the string
 * "true # shelved for now" and a `=== true` check silently fails — the flag
 * looks set in the file and does nothing.
 *
 * Only applies to unquoted values: a `#` inside quotes is content, and a `#`
 * not preceded by whitespace is too (`#hashtag`, a hex colour).
 */
function stripTrailingComment(value: string): string {
  if (/^["'[]/.test(value)) return value;
  return value.replace(/\s+#.*$/, "").trim();
}

function coerce(raw: string): unknown {
  const value = stripTrailingComment(raw.trim());

  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;

  // Inline flow list: [a, b, "c"]
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => coerce(item));
  }

  // Quoted scalar
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  if (quoted) return quoted[2];

  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  return value;
}

export function parseFrontmatter(source: string): {
  data: Frontmatter;
  content: string;
} {
  const match = FM_RE.exec(source);
  if (!match) return { data: {}, content: source };

  const data: Frontmatter = {};
  let pendingKey: string | null = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    // Block list item belonging to the previous key:
    //   tags:
    //     - oracle
    const listItem = /^\s+-\s+(.*)$/.exec(line);
    if (listItem && pendingKey) {
      const existing = data[pendingKey];
      const list = Array.isArray(existing) ? existing : [];
      list.push(coerce(listItem[1]));
      data[pendingKey] = list;
      continue;
    }

    const pair = /^([A-Za-z0-9_-]+)\s*:\s*([\s\S]*)$/.exec(line);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    pendingKey = key;
    if (rawValue.trim() === "") {
      // Value is on the following lines (block list) — seed an empty list.
      data[key] = [];
    } else {
      data[key] = coerce(rawValue);
    }
  }

  return { data, content: source.slice(match[0].length) };
}
