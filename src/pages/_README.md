# Astro Pages

### Refer to [Astro docs on Pages](https://docs.astro.build/en/basics/astro-pages/)

---

## Overview

Pages define the routes of the site. The project uses static site generation (SSG) for optimal performance and hosting flexibility.

## Page Types

### Static Pages

- `/` has no page: it is a 301 to `/works/` from `public/_redirects` in production (Astro's `redirects` config is used in dev only)
- **[about.astro](about.astro)** / **[contact.astro](contact.astro)**: Static studio pages
- **[404.astro](404.astro)**: Custom error page with links back to Works and Contact
- **[robots.txt.ts](robots.txt.ts)**: Generates `robots.txt` with the sitemap URL derived from `site`

### Collection Routes (Config-Driven)

All collection routes are generated from a single config array in [src/config/collections.ts](../config/collections.ts). The parameterised routes live under `src/pages/[collection]/`:

- **[index.astro]([collection]/index.astro)**: Collection index page listing all entries, driven by `ROUTE_COLLECTIONS`
- **[[...id].astro]([collection]/[...id].astro)**: Individual content pages; uses `buildDetailPaths()` from [collections.ts](../scripts/collections.ts)
- **[tags/index.astro]([collection]/tags/index.astro)**: Tag listing for a collection
- **[tags/[tag].astro]([collection]/tags/[tag].astro)**: Tag-specific pages; uses `buildTagPaths()`
- **[rss.xml.ts]([collection]/rss.xml.ts)**: RSS feed per collection; uses `generateRss()`

Adding a collection requires only one entry in `ROUTE_COLLECTIONS` -- all five route types are generated automatically.

### Dynamic Pages

The `[collection]` segment is matched by Astro's file-based routing against the collection name. For example, `/works/some-post` hits `[collection]/[...id].astro` with `collection = "works"` and `id = "some-post"`.

This covers both collections declared in `ROUTE_COLLECTIONS`: `works` and `research`.

## Dynamic Routing

Dynamic routes are generated from content collections defined in [content.config.ts](../content.config.ts) using `getStaticPaths()`:

```astro
---
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("works");
  return posts.map((post) => ({
    params: { id: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
---
```

Most of this boilerplate is handled by the shared helpers in [collections.ts](../scripts/collections.ts) - `buildDetailPaths()` and `buildTagPaths()`.

## RSS Feed Generation

Each collection directory generates an RSS feed via [collections.ts](../scripts/collections.ts)'s `generateRss()` helper:

- `/works/rss.xml`
- `/research/rss.xml`

The feeds are not linked from the site UI but remain available at these URLs.

## Type Safety

- **[collection] routes**: `ROUTE_COLLECTIONS` is declared `as const` and typed with `CollectionName`, so `getCollection(config.name)` receives a literal collection key.

## Component Integration

Each page incorporates [components](../components/) and [layouts](../layouts/) to maintain consistency. Pages typically:

1. Import needed components and layouts
2. Fetch data from content collections
3. Define any page-specific logic in the frontmatter
4. Render the appropriate layout with relevant content
