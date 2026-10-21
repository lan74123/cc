import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

import remarkGfm from "remark-gfm";
import undiciRetry from "./src/scripts/undici-retry.ts";
import tailwindcss from "@tailwindcss/vite";
import hqService from "@erfianugrah/astro-image-hq";
// Use no-op passthrough image service in dev to skip Sharp processing.
// Images are served as-is during development; full optimization runs in production builds.
const isDev =
  process.env.NODE_ENV !== "production" && !process.argv.includes("build");

// Markdown tables mark column alignment with the obsolete `align`
// attribute; write it as `text-align` instead, which lint:html allows.
function rehypeTableAlign() {
  const walk = (node) => {
    const align = node.properties?.align;
    if (align) {
      node.properties.style = `text-align: ${align}`;
      delete node.properties.align;
    }
    node.children?.forEach(walk);
  };
  return walk;
}

// https://astro.build/config
export default defineConfig({
  // Canonical/sitemap/RSS origin. Workers Builds sets SITE_URL; local
  // builds fall back to the production domain.
  site: process.env.SITE_URL ?? "https://ccspace.tw",

  // Hide Astro's dev toolbar so local previews look like the real site.
  devToolbar: { enabled: false },

  // Production: `/` -> `/works/` is a real 301 from public/_redirects
  // (Cloudflare). Astro's redirect would emit a meta-refresh page that
  // flashes "Redirecting from / to /works", so it is only used in dev.
  redirects: isDev ? { "/": "/works" } : {},

  image: {
    service: isDev
      ? { entrypoint: "astro/assets/services/noop" }
      : hqService({
          // Photography profile: HQ encoding + content-aware shadow boost.
          // Falls back to sharp if avifenc unavailable (with a warning).
          // See MEDIA_ENCODER.md for design rationale.
          profile: "photo",
          gpu: { maxMemoryUtilization: 0.5 },
          log: "summary",
        }),
  },

  integrations: [
    sitemap(),
    mdx(), // inherits syntaxHighlight, shikiConfig, remarkPlugins, rehypePlugins from markdown config
    undiciRetry(),
  ],

  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      theme: "rose-pine-dawn",
      defaultColor: false,
      themes: {
        light: "rose-pine-dawn",
        dark: "tokyo-night",
      },
      langs: [],
      wrap: true,
    },
    // mdx 6 / astro 6.4: the top-level remarkPlugins/rehypePlugins/gfm options
    // are deprecated. Pass them to unified() and set as markdown.processor —
    // MDX inherits automatically. Keep gfm: false because we apply remark-gfm
    // explicitly below (Astro's built-in adds it with default options first).
    processor: unified({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeTableAlign],
      gfm: false,
      // U+FE0E asks for the text arrow: iOS draws a bare ↩ as an emoji.
      remarkRehype: { footnoteBackContent: "↩︎" },
    }),
  },

  // Every link's HTML is fetched once it scrolls into view, so pages open
  // fast. experimental.clientPrerender is left off on purpose: in Chrome
  // it rendered each visible project in the background, hero photo and
  // all, costing phone data for projects never opened. Safari only ever
  // fetched the HTML.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },

  // Served from the site itself (downloaded from Google Fonts at build
  // time), not from Google. Montserrat draws Latin text; Noto Sans TC
  // (思源黑體) draws the Chinese it lacks. Text sits at weight 300, so
  // Chinese picks up the Light face while Montserrat, having nothing
  // lighter than 400, stays Regular. Bold (600/700) is 700 in both.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Montserrat",
      cssVariable: "--font-montserrat",
      display: "swap",
      // No generic fallback here: it would catch the Chinese before
      // Noto Sans TC got the chance.
      fallbacks: [],
      weights: [400, 700],
    },
    {
      provider: fontProviders.google(),
      name: "Noto Sans TC",
      cssVariable: "--font-noto-sans-tc",
      display: "swap",
      fallbacks: ["sans-serif"],
      weights: [300, 700],
    },
  ],

  build: {
    concurrency: 4,
    measuring: {
      entryBuilding: true,
      pageGeneration: true,
      bundling: true,
      rendering: true,
      assetProcessing: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
