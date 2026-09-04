/**
 * Fails the build when the app imports a package that package.json does not declare.
 *
 * This exists because of a real Netlify failure. `src/lib/languages.ts` imported
 * `highlight.js` in twelve places while only `lowlight` was declared. npm hoists the
 * transitive copy into the top level of node_modules, so every local build passed. Netlify
 * installs with pnpm, which does not hoist, and Rollup could not resolve the import at all.
 * The gap was invisible on the machine where the code was written, which is exactly the kind
 * of gap a script should catch instead of a deploy.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]);

/** Directories whose imports must resolve from package.json. */
const roots = ["src", "scripts"];
const files = ["vite.config.ts"];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs|js|jsx)$/.test(entry.name)) files.push(path.relative(root, full));
  }
};
for (const dir of roots) walk(path.join(root, dir));

/** Matches the specifier in a static import, a re-export, a dynamic import, and require. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

/** A scoped path and a plain path both reduce to the installable package name. */
const packageName = (specifier) => {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

const missing = new Map();
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const [, specifier] of source.matchAll(SPECIFIER)) {
    // Relative paths, the "@/" alias from vite.config.ts, node builtins, and bundler
    // virtual modules are all resolved by something other than package.json.
    if (/^[./]/.test(specifier)) continue;
    if (specifier.startsWith("@/")) continue; // the vite path alias
    if (specifier.startsWith("node:") || specifier.includes(":")) continue;
    const name = packageName(specifier);
    if (declared.has(name)) continue;
    if (!missing.has(name)) missing.set(name, new Set());
    missing.get(name).add(file);
  }
}

if (missing.size > 0) {
  console.error("undeclared imports: add these to package.json dependencies:\n");
  for (const [name, where] of [...missing].sort()) {
    console.error(`  ${name}`);
    for (const file of [...where].sort()) console.error(`      ${file}`);
  }
  console.error(
    "\nA transitive copy can satisfy these under npm and fail under pnpm, which is how they reach a deploy.",
  );
  process.exit(1);
}

console.log(`deps: ${files.length} files scanned, every import declared`);
