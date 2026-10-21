# Repository Guidelines

## Overview

This is the CC Space interior design studio site (https://ccspace.tw), an Astro 7 static site built from the Revista template.
It uses MDX content collections, vanilla Astro components with inline scripts for interactivity, and Tailwind CSS v4.
Primary runtime and package manager: Bun. Some helper scripts still run through Node.

## Rule Sources

- This `AGENTS.md` is the only agent-instruction file currently present in the repo.
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files were found during inspection.
- If any of those files are added later, merge their instructions into this document.

## Project Map

```text
src/
  components/       Astro components; `ui/` is empty (shadcn removed post-refactor)
  config/           Route and collection configuration (collections.ts)
  assets/           Images optimized at build time: logo/, works/<slug>/, cover.jpg
  content/          MDX content collections: works, research
  content.config.ts Zod-backed collection schemas and glob loaders
  consts.ts         Site constants, metadata, social links
  index.ts          Cloudflare Workers asset entry point
  layouts/          Shared Astro layouts
  pages/            File-based routes plus dynamic collection/tag pages
  scripts/          Client/build helpers such as collections, theme, lightbox, utils
  styles/           Global and shared CSS
public/             Static assets served as-is
scripts/            Node CLI/content maintenance scripts
dist/               Generated output; do not edit by hand
```

## Build, Lint, Test, and Dev Commands

Use Bun by default.

```sh
bun install                    # install dependencies
bun run dev                    # Astro dev server
bun run start                  # alias for dev
bun run build                  # production build; also runs the prebuild hook
bun run preview                # preview built site from dist/
bun run deploy:preview         # PUBLIC_PREVIEW=1 build, deploy to the cc-space-preview test site
bun run prebuild               # sync README/doc version badges
bun run lint:html              # validate generated HTML in dist/
bun run lint:links             # check every internal link and asset in dist/ (scripts/check-links.js)
bun run lint:site              # full quality gate: build + html + links
bun x astro check              # project-wide Astro/type/content validation
bun x prettier --check .       # formatting check
bun x prettier --write .       # format entire repo
bun run create                 # interactive content creation wizard
bun run update-post            # update content frontmatter
bun run clean                  # drop Astro's content cache after renaming entries (stale-import build errors)
node scripts/parser.js         # verify CLI/content schema drift
```

## Single-Test / Targeted Verification

The repository has a Playwright end-to-end suite in `tests/` covering the index route list (phone and split view), project pages, Discover more, the lightbox, islands across ClientRouter swaps, theme (including no dark-mode flash), navigation, SEO and assets. It runs in the installed Google Chrome (`channel: "chrome"` in `playwright.config.ts`) against `bun run preview`, so build first. Pages it visits are listed in `tests/pages.ts`. Against a production build, the 3 specs that need several projects skip (placeholders are preview-only); build with `PUBLIC_PREVIEW=1` to run all of them. When an AI agent runs it, Astro puts `astro preview` in the background and Playwright's web server exits, so set `ASTRO_PREVIEW_BACKGROUND=1` first.

```sh
bunx playwright test                                    # run full test suite
bunx playwright test tests/spec-name.spec.ts            # run a single spec file
bunx playwright test -g "test name pattern"             # run tests matching a pattern
bun x astro check                                       # quickest project-wide type/content check
bun x prettier --check src/path/to/file.astro           # single-file formatting check
bun x html-validate dist/path/to/page.html              # validate one generated page
```

- Content-only or markup edits: start with the narrowest command.
- Layout, routing, or build changes: prefer `bun run lint:site` before handoff.
- Component or script changes: run relevant Playwright specs to verify behavior.

## Build Pipeline Facts

- `bun run build` triggers `prebuild` automatically via package scripts.
- `prebuild` runs `scripts/sync-readme-versions.js`.
- `lint:html` and `lint:links` require built files in `dist/`.
- `.htmlvalidate.json` extends the recommended preset: inline `style` is allowed only for `object-position` (per-photo focal points) `text-align` (Markdown table column alignment) and the colour variables and wrapping Shiki writes on code blocks, and `void-style` is off because MDX emits `<hr/>`.
- Build concurrency is set to 4 in `astro.config.mjs` (a holdover from remote-CDN builds; harmless with local images).

## Image Handling

- All site images are local: project photos sit in the entry's own folder, `src/content/<collection>/<slug>/`, and go through the image service (cover via the schema's `image()`, gallery via `import.meta.glob` in `galleryFor()`). Site-wide images (logo, share cover) are in `src/assets/`. Do not put photos in `public/` — those are served unoptimized.
- The image service ignores EXIF Orientation, so phone photos would render sideways. `scripts/fix-orientation.js` bakes the rotation into the file; it runs in `prebuild` (and as `bun run fix-images`), so photos can be added as they come off a phone.
- Remote `http` image URLs are still accepted by the schema, but no remote image domains are configured.
- Write `sizes` for the width a photo is actually drawn at. A photo that covers a frame (`object-fit: cover`) taller than the photo's own shape is cropped at the sides and needs the frame's height times its aspect ratio (see the hero in `MarkdownPostLayout.astro`, the pane in `WorkCard.astro`, the thumbnails in `NextPost.astro`). Srcsets include 640w and 960w steps for 2x/3x phones.
- The lightbox opens a 2560px AVIF copy (`LIGHTBOX_MAX` in `Masonry.astro`), never the original file.
- Astro caches processed images in `node_modules/.astro/assets/`; a warm cache avoids re-downloading.
- `src/scripts/undici-retry.ts` configures a global `RetryAgent` for build-time HTTP fetches with exponential backoff (5 retries, 1s-60s), 120s body timeout, and 6 max connections.
- The Astro image cache only matters for the `bun run build` step (local or Cloudflare Workers Builds).

## Image Service (@erfianugrah/astro-image-hq)

- Production builds use the [`@erfianugrah/astro-image-hq`](https://www.npmjs.com/package/@erfianugrah/astro-image-hq) custom Astro image service (configured in `astro.config.mjs`).
- Profile is `photo`: hybrid routing - 4:2:0 10-bit fast path (NVENC > avifenc-svt > sharp) for typical content, with content-aware shadow boost promoting dark gradient images to 4:4:4 10-bit aom.
- Routing guards (since 0.1.x): codec capability detection runs at startup, and per-image constraints can drop the requested codec before encode - SVT-AV1 needs a >=64px smallest side and even dimensions for 4:2:0 (odd dimensions fall back to aom, which handles them internally), NVENC needs >=128px frames (falls back to sharp). Dimensions are re-validated after resize and encode failures retry with the next encoder in the chain.
- Since 0.1.5: alpha-bearing images route off SVT/NVENC to aom to preserve transparency. 4:2:0 AVIF output is clamped to even dimensions (odd-dim AVIFs fail to decode in Firefox). The package version is hashed into `propertiesToHash` so upgrades invalidate consumer image caches.
- Override precedence is **boost-as-floor**: profile defaults → component override (`<Image quality={N} />`) → shadow boost merges last. Bright images take the component value; dark gradients get clamped up by the boost.
- Falls back to sharp 8-bit with a warning when `avifenc` is missing -- local dev still works without it.
- Required system package: `libavif` on Arch, `libavif-bin` on Debian/Ubuntu. The Cloudflare Workers Builds image is not known to ship `avifenc`; check its build log for the sharp-fallback warning.
- Optional: ffmpeg + `av1_nvenc` for GPU-accelerated AVIF -- produces 4:2:0 only (8-bit or 10-bit); routing skips NVENC when 4:4:4 chroma is requested.
- Source code lives at https://github.com/erfianugrah/astro-image-hq (`~/astro-image-hq` for local development). Bump the `@erfianugrah/astro-image-hq` version in `package.json` then `bun install` to consume releases.
- When running locally without `avifenc`, the build still completes via sharp fallback. Banding may be visible in dark photographs; install `libavif` for the full fix.
- Image transforms cost ~150-500ms via NVENC (GPU), ~1-2s via avifenc-svt (CPU 4:2:0), ~3-5s via avifenc-aom (CPU 4:4:4 boosted). A cold full build takes 5-8 minutes wall clock; a warm `node_modules/.astro/assets/` cache revalidates in seconds.
- Releases use OIDC trusted publishing via tag push (no `NPM_TOKEN`).

## Formatting

- Prettier is the formatting authority; config lives in `.prettierrc.mjs`.
- `prettier-plugin-astro` handles `.astro` files.
- Use 2-space indentation; prefer double quotes unless a file already uses a different local convention.
- Do not reformat unrelated files just because you touched one file.
- Preserve file-local style in vendored or generated-style code.

## Imports

- Use ESM imports only; `package.json` sets `"type": "module"`.
- Group imports as framework/external packages, then internal modules, then styles when relevant.
- Use relative imports; no `@/` path alias is configured in `tsconfig.json`.
- Use `import { type Foo }` when importing types from value modules.
- Follow nearby extension style for local imports instead of mass-normalizing files.
- Common Astro imports include `astro:content`, `astro:assets`, and `astro:transitions`.

## TypeScript and Astro Conventions

- TypeScript strict mode via `tsconfig.json` extending `astro/tsconfigs/base` with `strictNullChecks: true`. No JSX transform is configured -- React has been removed.
- Keep shared types near the module that owns them; export them when reused.
- Use `satisfies` for object literals when it improves safety, as in `src/index.ts`.
- In `.astro` files, define a `Props` interface when the component accepts props.
- Prefer explicit return types for exported helpers when the shape is not obvious.
- Avoid `any`; use unions, interfaces, generics, or Zod-backed data shapes instead.

## Vanilla Island Patterns

- Interactivity is handled by vanilla `.astro` components with inline `<script>` blocks.
- Each script wires DOM inside an `astro:page-load` event handler so it survives ClientRouter view-transition swaps.
- Cleanup closures tear down previous listeners before re-adding, preventing accumulation across navigations.
- The four interactive islands are:
  - **ThemeToggle.astro**: SVG sun/moon toggle; dispatches `theme-toggle` event; CSS drives dark-state visuals; `theme.ts` handles localStorage and the `dark` class.
  - **Hamburger.astro**: Mobile menu toggle with 3-bar-to-X animation, Escape key handler, and click-outside-to-close.
  - **ScrollToTop.astro**: rAF-throttled visibility toggle; smooth `window.scrollTo`; semi-opaque pill kept clear of the mobile browser toolbar and the footer.
  - **HeroImage.astro**: Parallax hero with translate3d scroll, IntersectionObserver gate, rAF+lerp loop, fade-in on load, and `prefers-reduced-motion` respect.
- The contact page enquiry form (`contact.astro`, `src/styles/Contact.css`, `src/scripts/contactForm.ts`) is bilingual and promises a reply within 3 business days. It posts to `/api/contact` in `src/index.ts`, which checks a Turnstile token (widget `CC Space contact form`; localhost uses Cloudflare's always-pass test key) and mails the studio through the `send_email` binding. On the free plan that binding can only send to a verified Email Routing destination, so the recipient is the studio Gmail behind hello@ccspace.tw, kept out of the repo as the `CONTACT_TO` secret. Each Worker (`cc-space`, `cc-space-preview`) needs both `CONTACT_TO` and `TURNSTILE_SECRET` set with `wrangler secret put`; without them the endpoint answers 503.
- Larger islands keep their markup in the component and move styles and script out, loaded with an import and `<script src>`: **WorkCard.astro** (the index rows) uses `src/styles/WorkList.css` and `src/scripts/workList.ts`; **Masonry.astro** uses `MasonryLayout.css` and `lightbox.ts`.
- On wide screens a WorkCard's pane is laid out only once the row is `.is-warm` (pointed at or shown), so the index fetches one large photo up front; keep that if the pane markup changes.
- The `scripts/` directory holds shared logic (theme, lightbox) as plain TypeScript modules -- no React, no JSX.

## Astro Component Patterns

- Server-rendered `.astro` components are the default choice.
- Use frontmatter for imports, derived values, and async work.
- Keep layouts responsible for document metadata, shared structure, and page-level scripts.
- Reuse existing helpers like `buildDetailPaths()`, `buildTagPaths()`, `workCardProps()`, and `generateRss()` instead of duplicating route logic. Type entries with `Entry` from `collections.ts` rather than `any`.
- Prefer extending existing content/layout abstractions over creating parallel page-specific implementations.

## Styling and Tailwind

- Tailwind CSS v4.3.3 is wired through `@tailwindcss/vite` in `astro.config.mjs`.
- All config lives in `src/styles/global.css` as `@theme` blocks, `@plugin` directives, and `@custom-variant` declarations. No separate Tailwind config file exists.
- Dark mode uses `@custom-variant dark (&:where(.dark, .dark *))`.
- Custom breakpoints are defined in the `@theme` block: `sm=800`, `md=1200`, `lg=1900`, `xl=2500`.
- Type is Montserrat for Latin with Noto Sans TC (思源黑體) for the Chinese it lacks, both from Google Fonts via the `fonts` config in `astro.config.mjs` and self-hosted at build time. Components use the role utilities `font-heading` and `font-body` (`--font-heading` / `--font-body` in `@theme`; both are currently the same stack, kept separate so headings can change on their own). Montserrat has no generic fallback, or the generic would catch the Chinese first.
- Text sits at `font-weight: 300` (set on `html`): Chinese gets the Noto Light face, while Montserrat, built only at 400 and 700, matches up to Regular. Bold (600/700) is 700 in both. A new `font-weight` needs its weight added to `fonts`, or the browser falls back to the nearest built one per family.
- Noto Sans TC arrives as ~100 unicode-range slices of a variable font (300 and 700 share each file); the browser fetches only the slices a page uses (roughly 100-300 KB per page). Only Montserrat 400 is preloaded in `BaseLayout.astro`.
- Links prefetch their HTML when they scroll into view (`prefetch` in `astro.config.mjs`). `experimental.clientPrerender` stays off: it rendered every visible project in the background in Chrome, photos included.
- Prefer utility classes first; add custom CSS only for masonry, lightbox, or layout edge cases.
- Theme colours are CSS variables in `global.css`: `--paper` (page), `--ink` (type and marks) and `--line` (the hairline route), swapped by `html.dark`. Use them (`var(--ink)`, `bg-(--paper)`, `color-mix(in srgb, var(--ink) 20%, transparent)` for tints) instead of raw `rgb()` values and per-component dark overrides. The `theme-color` meta in `BaseLayout.astro` and `theme.ts` repeats `--paper` as hex.
- The typography plugin is loaded via `@plugin "@tailwindcss/typography"` in `global.css`. ESM imports work natively with Tailwind v4.2.2 -- the old `require()` workaround is no longer needed.

## Naming Conventions

- Components and layouts use PascalCase (`Header.astro`, `ThemeToggle.astro`, `BaseLayout.astro`).
- Utility modules use camelCase (`sortByDate.ts`, `collections.ts`).
- Constants use UPPER_SNAKE_CASE (`SITE_TITLE`).
- Functions and locals use camelCase; types and interfaces use PascalCase.
- Each content entry is a folder, `src/content/<collection>/<slug>/index.md` (`.mdx` also loads), beside its photos. The folder name is the id and URL slug; a `slug` field overrides it.
- Draft folders begin with `_` and are excluded by the glob loaders; `src/content/works/_template/` is the commented starting point for new projects.

## Content Collection Rules

- The studio edits content by hand: keep [CONTENT.md](CONTENT.md) (Chinese) in step with the schema and folder layout, and keep `index.md` plain Markdown (no imports or components) so it stays editable without code. The gallery is rendered by `MarkdownPostLayout.astro` from `galleryFor()`: every photo in the folder in file-name order, or the frontmatter `gallery` list.
- Collections are defined in `src/content.config.ts` using Zod schemas and Astro glob loaders.
- Shared frontmatter lives in the `baseFields` object, spread into each collection's inline schema.
- Keep collection names consistent across schemas, routes, pages, and CLI scripts.
- If you add or rename a collection, update both `src/content.config.ts` and the helpers in `scripts/`.
- Preserve existing frontmatter formatting unless a tool intentionally rewrites it.

## Content Tooling

- `bun run create` and `bun run update-post` wrap Node scripts in `scripts/`.
- `node scripts/parser.js` checks schema drift between the CLI tools and `src/content.config.ts`.
- When editing content tooling, verify both the runtime command and the drift checker.

## Error Handling and Defensive Coding

- Use optional chaining and nullish coalescing for nullable content data.
- Guard DOM queries like `getElementById`, `querySelector`, and mutation observers.
- Wrap `localStorage` access in `try/catch`; `src/scripts/theme.ts` is the reference pattern.
- Throw explicit errors for invalid required runtime or build state, for example missing `context.site` for RSS generation.
- Prefer small, explicit runtime guards over deeply nested assumptions.

## Generated and Deployment-Sensitive Files

- Do not commit `dist/` or `.env` files.
- Cloudflare Worker entrypoint is `src/index.ts`; keep it minimal and edge-safe.
- Wrangler config lives in `wrangler.jsonc`.

## Deployment Notes

- Deployment target is Cloudflare Workers (static assets). Deploys are atomic and asset URLs are content-hashed, so no cache purge step exists.
- `public/_headers` serves `/_astro/*` (content-hashed) as `immutable` for a year; HTML keeps the default revalidation so a deploy shows at once. It also sets nosniff, a referrer policy, `X-Frame-Options: SAMEORIGIN` and a permissions policy on every response. Never give an unhashed path a long cache.
- The Worker is named `cc-space` (`wrangler.jsonc`) and deploys via Cloudflare Workers Builds connected to GitHub: build command `bun run build`, deploy command `npx wrangler deploy` (`bun run deploy` locally).
- Design-review test site: `bun run deploy:preview` builds with `PUBLIC_PREVIEW=1` (shows the `PreviewSwitcher` layout panel and adds `noindex`) and deploys it with `wrangler deploy --name cc-space-preview` to https://cc-space-preview.lan74123.workers.dev, a separate Worker from `cc-space`. Deployed by hand; not wired to Workers Builds.
- Settled layout choices (H9 / D3, "Discover more" R without the figure, L2-1, C0, P1) are built into the styles of `WorkCard.astro` and `NextPost.astro`, so production and preview render the same layout. `PreviewSwitcher.astro` (dev and preview builds only) offers the still-open Gap option (`html[data-gap]`; production default S0) and the contact form layout (`html[data-contact]`, in `Contact.css`: F1 one column, the production default; F2 side by side; F3 numbered rows). It also has font rows (英文 / 中文 / 範圍) for the client to try their own font files on the real pages: the files are loaded with the FontFace API, kept in that browser's IndexedDB (`pv-fonts`), and override the `.font-heading` / `.font-body` utilities; nothing is uploaded.
- Placeholder content: entries with `placeholder: true` in frontmatter (the three `sample-*` works) appear in `astro dev` and preview builds only. Pages load entries through `getEntries()` in `src/scripts/collections.ts`, which filters them out of production builds; use it instead of `getCollection()` for anything visitors see. Delete or flip the flag once real projects replace them.
- `site` in `astro.config.mjs` reads `SITE_URL`, set as a Workers Builds env var to `https://ccspace.tw`. `robots.txt` is generated from `site` by `src/pages/robots.txt.ts`.
- Domain `ccspace.tw` is registered at PChome with nameservers delegated to Cloudflare and DNSSEC enabled (DS record at PChome). Before moving DNS off Cloudflare, clear the DS record at PChome first or the domain will stop resolving.
- `ccspace.tw` and `www.ccspace.tw` are Worker custom domains; the workers.dev URL is disabled. `www` -> apex and HTTP -> HTTPS are Cloudflare dashboard rules (Redirect Rules, Always Use HTTPS), not Worker code, because static asset requests never reach `src/index.ts`. `/` -> `/works/` is a 301 in `public/_redirects`.
- Email: `hello@ccspace.tw` forwards to the studio Gmail via Cloudflare Email Routing (receive only).
- Logos live in `src/assets/logo/` (`ccspace_b.svg` for light theme, `ccspace_w.svg` for dark theme); `public/favicon.svg` is the "CC" monogram and switches colour via `prefers-color-scheme`.

## Agent Workflow Recommendations

- Read the nearby file first and follow its established style before editing.
- Prefer the smallest effective change; avoid broad refactors unless the task requires them.
- Run the narrowest relevant verification command after each change.
- Before handoff on substantive code changes, prefer `bun run lint:site` if time permits.
- If you touch content tooling or collection schemas, also run `node scripts/parser.js`.
- Update this file whenever repo conventions, scripts, or rule sources change.
