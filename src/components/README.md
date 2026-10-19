# Astro Components

### Refer to [Astro docs on Components](https://docs.astro.build/en/basics/astro-components/)

---

## Overview

Components are the reusable building blocks of the site. All are Astro `.astro` files -- zero JS by default, with a few vanilla islands whose inline `<script>` blocks wire DOM inside `astro:page-load` handlers so they survive ClientRouter view-transition swaps.

## Key Components

### Page & Layout Components

- **[BlogPost.astro](BlogPost.astro)**: Row on the `/works/` and `/research/` index pages and tag pages, hung on one route line. Phones open a row in place (large photo, facts, description, "View project") with a walking figure that closes it; from 800px the list keeps the left half and a fixed pane on the right shows the pointed-at project, with one figure walking the route between rows. These are the layouts settled with the client (H9 / D3, P1, C0); they are plain styles, not toggled by attributes.

- **[Homepage.astro](Homepage.astro)**: Random-image landing component backed by [homePage.ts](../scripts/homePage.ts). Currently unused — `/` redirects to `/works/`.

- **[HeroImage.astro](HeroImage.astro)**: Vanilla parallax hero image on content pages. Uses one `<img>` with a width-based `srcset` (640-3200w) and a `sizes` that covers the cropped parallax box, so portrait covers stay sharp on wide screens; the `<img>` carries real alt text (no separate sr-only element). An `IntersectionObserver` ensures the parallax scroll handler only runs while visible, and `will-change: transform` keeps it on the compositor. Supports per-image `positionX`/`positionY` focal point overrides and absolute tag links with collection awareness. The `-20%`/`120%` oversized inner div gives headroom for the parallax offset. All hooks re-wire on `astro:page-load`.

- **[NextPost.astro](NextPost.astro)**: "Discover more" at the bottom of posts: every entry of the collection in index order on a route line, the current one marked with a solid number, under a corner line carrying the "All works" link (layout R / L2-1). Rendered on the server; no client script.

### Header Components

- **[Header.astro](Header.astro)**: Main header, incorporates:
  - **[Hamburger.astro](Hamburger.astro)**: Mobile menu toggle. Uses CSS transitions (no framer-motion). Includes `aria-expanded`, `aria-controls`, Escape key handler, and click-outside-to-close for accessibility. All hooks re-wire on `astro:page-load`.
  - **[ThemeToggle.astro](ThemeToggle.astro)**: Self-contained light/dark mode switcher with inline SVG sun/moon. CSS drives dark-state visuals; `theme-toggle` custom event is dispatched on click; [theme.ts](../scripts/theme.ts) handles the actual class toggle and localStorage persistence. All hooks re-wire on `astro:page-load`.
  - **[Navigation.astro](Navigation.astro)**: Site navigation menu with `aria-label` attributes

- **[Footer.astro](Footer.astro)**: Site footer with social media icons from [astro-icon](../../package.json)

### Content Presentation Components

- **[Masonry.astro](Masonry.astro)**: Project photo gallery. Shows each photo whole in a centred exhibition column, landscapes wider than portraits, via [MasonryLayout.css](../styles/MasonryLayout.css). Integrates with [lightbox.ts](../scripts/lightbox.ts) (via `lightbox-link` class on gallery links) for fullscreen viewing with multi-level zoom and drag/pan.

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
- **NextPost.astro**: Uses a `CollectionName` type (from `collections.ts`) for the collection prop and loads entries through `getEntries()`.

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
