#!/usr/bin/env node

/**
 * check-links.js
 *
 * Checks every internal link and asset in the built site (dist/): each
 * href, src, srcset and poster in the HTML pages, and each url() in the
 * CSS files, must point at a file that exists (or at a redirect source in
 * public/_redirects), and a #fragment must name an id on its page.
 * External URLs are skipped. Exits 1 and lists the broken ones otherwise.
 *
 * Replaces the hyperlink package, whose old dependency tree carried most
 * of `bun audit`'s critical and high advisories.
 *
 * Usage: bun run lint:links   (after a build)
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, posix, relative, resolve, sep } from "node:path";

const DIST = resolve(import.meta.dirname, "..", "dist");

if (!existsSync(DIST)) {
  console.error("dist/ not found: run `bun run build` first.");
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

/** Site path ("/works/daliao/") of a built file. */
function sitePath(file) {
  const rel = "/" + relative(DIST, file).split(sep).join("/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
}

// Redirect sources from _redirects count as existing pages.
const redirects = new Set();
const redirectsFile = join(DIST, "_redirects");
if (existsSync(redirectsFile)) {
  for (const line of readFileSync(redirectsFile, "utf8").split(/\r?\n/)) {
    const source = line.trim().split(/\s+/)[0];
    if (source && !source.startsWith("#")) redirects.add(source);
  }
}

/** The built file a site path resolves to, or null. */
function resolveTarget(path) {
  if (redirects.has(path)) return "redirect";
  const file = join(DIST, ...path.split("/").filter(Boolean));
  if (path.endsWith("/")) {
    const index = join(file, "index.html");
    return existsSync(index) ? index : null;
  }
  if (existsSync(file) && statSync(file).isFile()) return file;
  // Extensionless paths are pages: /about -> /about/index.html.
  if (!extname(path) && existsSync(join(file, "index.html"))) {
    return join(file, "index.html");
  }
  return null;
}

const ATTR = /\s(href|src|srcset|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi;
const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const ID = /\sid\s*=\s*("([^"]*)"|'([^']*)')/gi;

const files = walk(DIST);
const idsByPage = new Map();
function idsOf(file) {
  if (!idsByPage.has(file)) {
    const ids = new Set();
    for (const m of readFileSync(file, "utf8").matchAll(ID)) {
      ids.add(m[2] ?? m[3]);
    }
    idsByPage.set(file, ids);
  }
  return idsByPage.get(file);
}

const broken = [];
let checked = 0;

function check(from, raw) {
  const url = raw.trim().replace(/&amp;/g, "&");
  if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return; // external, mailto:, data:...
  checked++;
  const [beforeHash, fragment] = url.split("#");
  const pathPart = beforeHash.split("?")[0];
  const fromPath = sitePath(from);
  const base = fromPath.endsWith("/")
    ? fromPath
    : posix.dirname(fromPath) + "/";
  const path = pathPart
    ? decodeURIComponent(posix.resolve(base, pathPart)) +
      (pathPart.endsWith("/") ? "/" : "")
    : fromPath;
  const target = pathPart ? resolveTarget(path.replace(/\/+$/, "/")) : from;
  if (!target) {
    broken.push(`${fromPath}  ->  ${url}  (no such file)`);
    return;
  }
  if (fragment && target !== "redirect" && target.endsWith(".html")) {
    if (!idsOf(target).has(decodeURIComponent(fragment))) {
      broken.push(
        `${fromPath}  ->  ${url}  (no element with id "${fragment}")`,
      );
    }
  }
}

for (const file of files) {
  if (file.endsWith(".html")) {
    const html = readFileSync(file, "utf8")
      // Inline script bodies and JSON-LD are not links; a script's own
      // src attribute stays and is checked.
      .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2");
    // Inline <style> blocks (the @font-face rules) carry url()s too.
    for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      for (const m of style[1].matchAll(CSS_URL)) check(file, m[2]);
    }
    for (const m of html.matchAll(ATTR)) {
      const value = m[3] ?? m[4];
      if (m[1].toLowerCase() === "srcset") {
        for (const candidate of value.split(",")) {
          check(file, candidate.trim().split(/\s+/)[0]);
        }
      } else {
        check(file, value);
      }
    }
  } else if (file.endsWith(".css")) {
    for (const m of readFileSync(file, "utf8").matchAll(CSS_URL)) {
      check(file, m[2]);
    }
  }
}

if (broken.length > 0) {
  console.error(`${broken.length} broken of ${checked} internal links:\n`);
  for (const line of broken) console.error("  " + line);
  process.exit(1);
}
console.log(`All ${checked} internal links and assets resolve.`);
