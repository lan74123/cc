import type { AstroIntegration } from "astro";
import { copyFile, readdir, rm, rmdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Pages still served while the site is closed: /privacy/ is the
 *  privacy policy speednotebot's Google OAuth consent screen links to. */
export const COMING_SOON_KEEP = ["/", "/privacy/"];

/**
 * Coming-soon mode (PUBLIC_COMING_SOON=1, wired in astro.config.mjs).
 * Puts ComingSoon.astro at `/`, then, once the site is built, removes
 * every other page (bar COMING_SOON_KEEP), the RSS feeds and the
 * `/ -> /works/` redirect, and copies the page to 404.html, which the
 * Worker serves for any address without a file. So every URL shows the
 * coming-soon page: `/` with 200, the rest with 404.
 */
export default function comingSoon(): AstroIntegration {
  return {
    name: "coming-soon",
    hooks: {
      "astro:config:setup": ({ injectRoute }) => {
        injectRoute({
          pattern: "/",
          entrypoint: new URL("./ComingSoon.astro", import.meta.url),
        });
      },
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const keep = new Set(
          COMING_SOON_KEEP.map((p) => `${p.replace(/^\//, "")}index.html`),
        );
        let removed = 0;

        // Returns whether the directory is empty afterwards.
        const prune = async (path: string): Promise<boolean> => {
          let left = 0;
          for (const entry of await readdir(path, { withFileTypes: true })) {
            const full = join(path, entry.name);
            const rel = relative(root, full).split(sep).join("/");
            if (entry.isDirectory()) {
              if (rel === "_astro" || !(await prune(full))) left++;
              else await rmdir(full);
            } else if (
              (rel.endsWith(".html") && !keep.has(rel)) ||
              rel.endsWith("rss.xml") ||
              rel === "_redirects"
            ) {
              await rm(full);
              removed++;
            } else left++;
          }
          return left === 0;
        };

        await prune(root);
        await copyFile(join(root, "index.html"), join(root, "404.html"));
        logger.info(
          `coming soon: removed ${removed} files, 404.html shows the page`,
        );
      },
    },
  };
}
