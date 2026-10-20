import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

import remarkGfm from "remark-gfm";
import icon from "astro-icon";
import undiciRetry from "./src/scripts/undici-retry.ts";
import tailwindcss from "@tailwindcss/vite";
import hqService from "@erfianugrah/astro-image-hq";
// Use no-op passthrough image service in dev to skip Sharp processing.
// Images are served as-is during development; full optimization runs in production builds.
const isDev =
  process.env.NODE_ENV !== "production" && !process.argv.includes("build");

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
    icon(),
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
      gfm: false,
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

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Inconsolata",
      cssVariable: "--font-inconsolata",
      display: "swap",
      fallbacks: ["monospace"],
      // Only the weights the site sets: 400 for text, 700 for bold.
      weights: [400, 700],
      optimizedFallbacks: true,
    },
    {
      provider: fontProviders.fontsource(),
      name: "Overpass Mono",
      cssVariable: "--font-overpass-mono",
      display: "swap",
      fallbacks: ["monospace"],
      weights: [400, 700],
      optimizedFallbacks: true,
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
