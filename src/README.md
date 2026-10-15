# Architecture Documentation

### Technical architecture of the CC Space site

---

## Component Architecture

### Vanilla Island Patterns

All interactive components are vanilla Astro `.astro` files with inline `<script>` blocks. There is no React, no JSX, and no hydration directives.

```mermaid
graph TD
    A["BaseLayout.astro"] --> B["Header.astro"]
    B --> C["ThemeToggle.astro"]
    B --> E["Navigation.astro"]
    B --> F["Hamburger.astro"]
```

### Key Integration Points

1. **ThemeToggle** (self-contained Astro component):
   - Inline SVG with CSS-driven dark-state visuals (ray opacity/scale, circle radius)
   - Dispatches `theme-toggle` custom event on click
   - `theme.ts` handles localStorage persistence and the `dark` class on `<html>`
   - `initTheme()` is called in the script block (idempotent -- safe across navigations)
   - All DOM hooks re-wire on `astro:page-load` for ClientRouter compatibility

2. **Hamburger** (vanilla Astro component):
   - 3-bar-to-X CSS transition animation
   - Escape key handler and click-outside-to-close
   - Cleanup closure removes document-level listeners before re-adding on navigation

3. **ScrollToTop** (vanilla Astro component):
   - rAF-throttled scroll listener with self-terminating loop
   - Transparent background with inherited-colour chevron
   - Smooth `window.scrollTo({ behavior: "smooth" })`

4. **HeroImage** (vanilla Astro component):
   - translate3d parallax with rAF+lerp loop
   - IntersectionObserver-gated (parallax only runs while visible)
   - Fade-in on image load, `prefers-reduced-motion` respect
   - Cleanup closure pattern for ClientRouter safety

```astro
---
// ThemeToggle.astro -- self-contained, no React wrapper
---

<button id="theme-toggle-btn" aria-label="Switch to dark theme">
  <svg><!-- sun/moon SVG with CSS-driven states --></svg>
</button>

<script>
  import { initTheme } from "../scripts/theme.ts";
  initTheme();

  document.addEventListener("astro:page-load", () => {
    const btn = document.getElementById("theme-toggle-btn");
    btn?.addEventListener("click", () => {
      window.dispatchEvent(new Event("theme-toggle"));
    });
  });
</script>
```

### State Management

- `theme.ts` owns the state (localStorage + DOM class)
- Astro components are pure UI that dispatch events
- `astro:page-load` re-applies theme after View Transitions body swap
- No React state, no `useEffect`, no `MutationObserver` sync needed

## Masonry Image Grid Implementation

The Masonry layout is a key visual feature of the site, implemented with CSS Grid rather than JavaScript-based libraries for better performance.

### Technical Implementation

```mermaid
graph TD
    A["Masonry.astro"] --> B["MasonryLayout.css"]
    A --> C["lightbox.ts"]
    A --> D["astro:assets"]
    D --> E["getImage optimization"]
```

### CSS Grid Configuration

```css
/* Key aspects of the Masonry layout */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  grid-auto-flow: dense;
}

/* Variable sizing for visual interest */
.image-container:nth-child(3n) {
  grid-row: span 2; /* Every 3rd image spans 2 rows */
}

.image-container:nth-child(4n) {
  grid-column: span 2; /* Every 4th image spans 2 columns */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .masonry {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  /* Reset spanning on smaller screens */
  .image-container:nth-child(3n),
  .image-container:nth-child(4n) {
    grid-row: auto;
    grid-column: auto;
  }
}
```

### Image Processing Pipeline

1. **Image Collection**: Images are specified in MDX frontmatter
2. **Optimization**: The `getImage` function from `astro:assets` processes each image:
   - Converts to AVIF format for better compression
   - Sets loading="lazy" for performance
   - Handles proper width/height attributes for CLS prevention
3. **Rendering**: Images are placed in the grid with CSS handling the layout
4. **Lightbox Integration**: A custom lightbox is attached for fullscreen viewing

## Custom Tailwind Configuration

The site uses a highly customized Tailwind configuration with specific breakpoints optimized for image-heavy pages.

### Custom Breakpoints

```css
/* src/styles/global.css @theme block */
--breakpoint-sm: 800px;
--breakpoint-md: 1200px;
--breakpoint-lg: 1900px;
--breakpoint-xl: 2500px;
```

These breakpoints were specifically chosen based on:

1. Common display sizes for photography viewing
2. Optimal image grid layouts at different widths
3. Text readability considerations

### Custom Utilities

Image focal-point overrides are applied directly as inline `style` attributes on `<img>` elements (e.g., `style="object-position: center top 33.33%"`). No custom Tailwind utilities are needed.

## Content Schema and Validation

### CollectionName Type

`src/scripts/collections.ts` exports a `CollectionName` type — the union of content collection keys (`"works" | "research"`). It is used wherever `getCollection()` is called with a dynamic collection name, because Astro's generated types require a literal union member, not a plain `string`.

### MDX remarkPlugins Behavior

The `mdx()` integration inherits `remarkPlugins` and `rehypePlugins` from the base `markdown` config. Plugins are listed once via `markdown.processor: unified({ remarkPlugins: [...], rehypePlugins: [...] })` -- MDX picks them up automatically.

### Schema Definition Pattern

Collections are defined in `src/content.config.ts`. Shared fields live in a plain `baseFields` object that each collection spreads into its own inline schema, so the `image()` helper from `defineCollection`'s context stays correctly typed:

```typescript
const works = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/works" }),
  schema: ({ image }) =>
    z.object({
      ...baseFields, // title, tags, author, description, location, year, client, category, pubDate, ...
      image: z
        .object({
          src: z.union([
            z.string().startsWith("http"),
            z.string().startsWith("/"),
            image(),
          ]),
          alt: z.string(),
          positionx: z.string().optional(),
          positiony: z.string().optional(),
        })
        .optional(),
    }),
});
```

`research` uses the same shape with `base: "./src/content/research"`.

### Glob Pattern Selection

`glob({ pattern: "**/[^_]*.mdx", base: "./src/content/works" })`:

1. `**/` - Recursively searches all subdirectories
2. `[^_]*` - Ignores files that start with underscore (drafts)
3. `.mdx` - Only selects MDX files

## Image Optimization Strategy

1. **Astro image service**: The [`@erfianugrah/astro-image-hq`](https://www.npmjs.com/package/@erfianugrah/astro-image-hq) custom Astro image service (profile `photo`) handles production builds, with a `noop` service fallback in dev. Configured in `astro.config.mjs`; handles AVIF conversion, responsive sizing, and proper metadata.

2. **Local images only**: project photos live in `src/assets/works/<slug>/` and are imported from MDX so they go through the image service. Files in `public/` bypass optimization, so photos should not be placed there.

3. **Loading optimizations**:
   - `loading="lazy"` for below-the-fold images
   - Proper sizing attributes to prevent layout shifts

## Tag System Architecture

```mermaid
graph TD
    A["MDX Content"] -->|"frontmatter.tags"| B["buildTagPaths()"]
    B --> C["Tag Pages"]
    B --> D["Tag Index Pages"]
```

1. Each entry lists tags in its frontmatter (`tags: ["home"]`). Empty strings are ignored.
2. `buildTagPaths()` in `src/scripts/collections.ts` collects the unique tags of a collection and returns one static path per tag.
3. `src/pages/[collection]/tags/[tag].astro` renders them, e.g. `/works/tags/home/` and `/works/tags/commerce/`.
