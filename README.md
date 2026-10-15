<p>
  <img alt="Astro" src="https://img.shields.io/badge/Astro-7.2.10-FF5D01.svg?logo=astro&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.2.2-38B2AC.svg?logo=tailwind-css&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6.svg?logo=typescript&logoColor=white" />
  <img alt="MDX" src="https://img.shields.io/badge/%40astrojs%2Fmdx-8.0.0-1B1F24.svg?logo=mdx&logoColor=white" />
  <img alt="Cloudflare" src="https://img.shields.io/badge/Cloudflare-Workers-F38020.svg?logo=cloudflare&logoColor=white" />
</p>

# CC Space

Portfolio site for CC Space, an interior design studio — live at <https://ccspace.tw>.

Built with Astro v7.2.10, MDX content collections, vanilla Astro components and Tailwind CSS v4.2.2, deployed as static assets on Cloudflare Workers. Originally based on the open-source [Revista](https://github.com/erfianugrah/revista-3) template (see `LICENSE`).

## Quick start

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # http://localhost:4321
```

| Command               | What it does                                           |
| --------------------- | ------------------------------------------------------ |
| `bun run dev`         | Dev server with hot reload (images served unoptimized) |
| `bun run build`       | Production build into `dist/` (optimizes every image)  |
| `bun run preview`     | Serve the built `dist/` locally                        |
| `bun run deploy`      | Deploy `dist/` with Wrangler (normally CI does this)   |
| `bun run create`      | Interactive wizard for a new work / research entry     |
| `bun run update-post` | Update frontmatter of an existing entry                |
| `bun x astro check`   | Type and content-schema check                          |
| `bun run lint:site`   | Build, then validate HTML and internal links           |

## Site structure

| Route                   | Source                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `/`                     | 301 to `/works/` (`public/_redirects`)                                                  |
| `/works/`, `/research/` | Collection index, detail, tag and RSS routes generated from `src/config/collections.ts` |
| `/about/`, `/contact/`  | `src/pages/about.astro`, `src/pages/contact.astro`                                      |
| 404                     | `src/pages/404.astro`                                                                   |

## Adding a project

1. Put the photos in `src/assets/works/<slug>/` (`1.jpg`, `2.jpg`, …). Files under `src/assets/` are resized and converted to AVIF at build time; files under `public/` are served as-is, so do not put photos there.
   Then run `bun run fix-images`: phone photos are stored sideways with an EXIF orientation tag that the build ignores, and this rotates them upright.
2. Create `src/content/works/YYYY-MM-DD-<slug>.mdx` — copy `2026-10-05-sample-cafe.mdx` as a starting point. Frontmatter fields are defined in `src/content.config.ts` (`category` is `Home` or `Commerce`; empty `location` / `year` / `client` are hidden).
3. Files starting with `_` are treated as drafts and not published.
4. Commit and push to `main`.

## Branding

- Site title, description and social links: `src/consts.ts`
- Header logo: `src/assets/logo/ccspace_b.svg` (light theme) and `ccspace_w.svg` (dark theme)
- Favicon: `public/favicon.svg` ("CC" monogram, follows the system colour scheme); `public/apple-touch-icon.png` and `public/icon-512.png`
- Social share image: `src/assets/cover.jpg` (1920×1080). Do not make it a byte-identical copy of a gallery photo: the build dedupes identical files and then drops the original that the gallery lightbox links to.

## Deployment

Pushing to `main` triggers Cloudflare Workers Builds on the studio's Cloudflare account:

- Worker name `cc-space` (`wrangler.jsonc`), build command `bun run build`, deploy command `npx wrangler deploy`.
- Build env var `SITE_URL=https://ccspace.tw` sets canonical URLs, sitemap, RSS and `robots.txt`.
- `www` → apex and HTTP → HTTPS redirects are Cloudflare dashboard rules, not code.
- The domain is registered at PChome with nameservers on Cloudflare and DNSSEC enabled. Before moving DNS away from Cloudflare, clear the DS record at PChome first.
- `hello@ccspace.tw` is forwarded to the studio Gmail via Cloudflare Email Routing.

## More docs

See `docs/README.md` for the documentation index and `AGENTS.md` for repository conventions.
