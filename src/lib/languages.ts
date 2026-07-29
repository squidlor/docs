/**
 * Explicit highlight.js language registry.
 *
 * rehype-highlight defaults to highlight.js's "common" bundle — around 40
 * grammars, most of which never appear in these docs. Registering only what we
 * use cuts a large chunk out of the JS payload, and lets us add Solidity, which
 * highlight.js doesn't ship at all.
 */

import bash from "highlight.js/lib/languages/bash";
import diff from "highlight.js/lib/languages/diff";
import http from "highlight.js/lib/languages/http";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { solidity } from "highlightjs-solidity";

/** Keys double as the accepted ```fence identifiers. */
export const languages = {
  bash,
  sh: bash,
  shell: bash,
  console: bash,
  diff,
  env: ini,
  http,
  ini,
  toml: ini,
  js: javascript,
  javascript,
  jsx: javascript,
  json,
  jsonc: json,
  plaintext,
  text: plaintext,
  python,
  py: python,
  sol: solidity,
  solidity,
  ts: typescript,
  typescript,
  tsx: typescript,
  html: xml,
  xml,
  yaml,
  yml: yaml,
};
