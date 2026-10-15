# Astro Components

### Refer to [Astro docs on Components](https://docs.astro.build/en/basics/astro-components/)

---

## Overview

Components are the reusable building blocks of the site. All are Astro `.astro` files -- zero JS by default, with a few vanilla islands whose inline `<script>` blocks wire DOM inside `astro:page-load` handlers so they survive ClientRouter view-transition swaps.

## Key Components

### Page & Layout Components

- **[BlogPost.astro](BlogPost.astro)**: Card component for post previews on the `/works/` and `/research/` index pages and tag pages, including the category/year line for works.

- **[Homepage.astro](Homepage.astro)**: Random-image landing component backed by [homePage.ts](../scripts/homePage.ts). Currently unused — `/` redirects to `/works/`.

- **[HeroImage.astro](HeroImage.astro)**: Vanilla parallax hero image on content pages. Uses a `<picture>` element with `<source>` for responsive image delivery; the `<img>` carries real alt text (no separate sr-only element). An `IntersectionObserver` ensures the parallax scroll handler only runs while visible, and `will-change: transform` keeps it on the compositor. Supports per-image `positionX`/`positionY` focal point overrides and absolute tag links with collection awareness. The `-20%`/`120%` oversized inner div gives headroom for the parallax offset. All hooks re-wire on `astro:page-load`.

- **[NextPost.astro](NextPost.astro)**: Related content suggestion shown at the bottom of posts. Picks random posts from the same collection (excluding the current one) and renders them as linked preview cards. Posts without a hero image show the `src/assets/logo/ccspace_b.svg` wordmark as a placeholder (inverted in dark mode).

### Header Components

- **[Header.astro](Header.astro)**: Main header, incorporates:
  - **[Hamburger.astro](Hamburger.astro)**: Mobile menu toggle. Uses CSS transitions (no framer-motion). Includes `aria-expanded`, `aria-controls`, Escape key handler, and click-outside-to-close for accessibility. All hooks re-wire on `astro:page-load`.
  - **[ThemeToggle.astro](ThemeToggle.astro)**: Self-contained light/dark mode switcher with inline SVG sun/moon. CSS drives dark-state visuals; `theme-toggle` custom event is dispatched on click; [theme.ts](../scripts/theme.ts) handles the actual class toggle and localStorage persistence. All hooks re-wire on `astro:page-load`.
  - **[Navigation.astro](Navigation.astro)**: Site navigation menu with `aria-label` attributes

- **[Footer.astro](Footer.astro)**: Site footer with social media icons from [astro-icon](../../package.json)

### Content Presentation Components

- **[Masonry.astro](Masonry.astro)**: Photo gallery with CSS Grid masonry layout. Accepts per-image `positionx`/`positiony` focal point overrides (same pattern as hero images). Smart default crop at `center 25%` for portrait photography. Uses [MasonryLayout.css](../styles/MasonryLayout.css) with `@supports` progressive enhancement for native CSS masonry. Integrates with [lightbox.ts](../scripts/lightbox.ts) (via `lightbox-link` class on gallery links) for fullscreen viewing with multi-level zoom and drag/pan.

- **[GetRandomImage.astro](GetRandomImage.astro)**: Used in [TagLayout.astro](../layouts/TagLayout.astro) to randomize featured images from content collections. Includes a `<noscript>` fallback for non-JS users.

### Typography Components

- **[Prose.astro](Prose.astro)**: Tailwind CSS typographic layout used throughout the site for consistent text formatting.
- **[ProseHeadings.astro](ProseHeadings.astro)**: Specialized component for formatting headings.

### Utility Components

- **[sortByDate.ts](sortByDate.ts)**: Used in [Pages](../pages/) to chronologically order posts rendered by [BlogPost.astro](BlogPost.astro).

- **[ScrollToTop.astro](ScrollToTop.astro)**: Vanilla "back to top" button. Uses `requestAnimationFrame` throttling on the scroll listener for performance, and smooth scrolling via `window.scrollTo`. Transparent background with inherited-colour chevron. All hooks re-wire on `astro:page-load`.

### UI Primitives

The `ui/` directory is empty -- shadcn/ui was removed during the React removal refactor. Tailwind utility classes are applied directly in `.astro` components instead.

## Component Relationships

Components follow a hierarchical structure, with layout components (BaseLayout, MarkdownPostLayout) wrapping content components. `<slot />` injects content from MDX files in the content collections.

## Notes

- All components follow Astro's `.astro` file format with a mix of frontmatter, HTML templates, and component script sections
- Interactive islands use vanilla inline scripts wired inside `astro:page-load` handlers with cleanup closures for ClientRouter compatibility
- Styling uses Tailwind CSS v4 utilities

### Type Safety

Several components carry inline type declarations to satisfy `astro check` without adding external `@types/*` packages:

- **Header.astro**: Imports the light/dark SVG wordmarks from `src/assets/logo/` and swaps them with `dark:hidden` / `hidden dark:block`.
- **Masonry.astro**: Avoids `key` props on native HTML elements (unlike React, Astro templates don't support `key` on non-component elements).
- **NextPost.astro**: Uses a `CollectionName` type (from `collections.ts`) for the collection prop, a `PostData` interface for frontmatter fields, and typed `getImage()` parameters.

## Shared Utilities

Several components share logic extracted into `src/scripts/`:

- **[randomImage.ts](../scripts/randomImage.ts)**: Fisher-Yates shuffle and random image picker logic. Used by `homePage.ts` and `getRandomImage.ts` (renamed from `getrandomimage.ts`).
- **[consts.ts](../consts.ts)**: Site-wide constants (title, description, author, copyright owner, social links) imported by Header, Footer, BaseLayout, and collections.ts.

## Removed Components

The following were removed during the code quality refactoring:

- `Greeting.jsx` - unused React greeting component
- `Search.astro` / `Pagefind.astro` - search functionality removed entirely (small work count made it unnecessary); indexing (`pagefind` postbuild step), `data-pagefind-*` markers, and the header search trigger were removed alongside it
- `Social.astro` / `HomepageMasonry.astro` - dead code, no references
- `fslightbox.js` - vendored lightbox, replaced by custom `lightbox.ts`
- GLightbox CSS/JS - replaced by custom lightbox (73 KB -> ~2.4 KB gzipped)
- `FormattedDate.astro` - date formatting now handled inline via `formatDate()` from `utils.ts`
- CV components (`cv/`, `ProseCv.astro`) and their `duration.ts` / `since94.ts` helpers - template leftovers with no CV page
- `framer-motion` - removed as dependency; Hamburger.astro and ThemeToggle.astro now use pure CSS transitions
