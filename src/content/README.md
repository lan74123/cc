# Astro Content Collections

### Refer to [Astro docs on Content Collections](https://docs.astro.build/en/guides/content-collections/)

---

## Overview

Content Collections are a powerful feature in Astro for organizing and managing structured content. In this project, all content (project pages and research articles) is organized into collections defined in [content.config.ts](/src/content.config.ts).

## Collection Structure

The `src/content/` directory contains two collections, both routed through the config-driven `[collection]` pages (see [src/config/collections.ts](../config/collections.ts)):

- **works/**: Interior design project pages (location/year/client/category)
- **research/**: Case-study and research articles

## Schema Definition

Each collection is defined in [content.config.ts](/src/content.config.ts) with a strict schema using Zod for validation. This ensures that all content follows a consistent structure and has the required metadata.

### Example Schema

`works` and `research` share a `baseFields` object (title, tags, author, description, pubDate/updatedDate, slug, readingTimeMs, plus the optional `location`/`year`/`client`/`category` fields used by works detail pages). Each collection still declares its own `schema: ({ image }) => z.object({ ...baseFields, image: ... })` inline, rather than a shared factory function, so that `image`'s real type flows in from `defineCollection`'s context instead of widening to `any`:

```typescript
const baseFields = {
  title: z.string(),
  tags: z.array(z.string()),
  author: z.string(),
  description: z.string(),
  location: z.string().optional(),
  year: z.string().optional(),
  client: z.string().optional(),
  category: z.enum(["Home", "Commerce"]).optional(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  slug: z.string().optional(),
  readingTimeMs: z.number().optional(),
};

const research = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/research" }),
  schema: ({ image }) =>
    z.object({
      ...baseFields,
      image: z
        .object({
          src: z.union([z.string().startsWith("http"), z.string().startsWith("/"), image()]),
          alt: z.string(),
          positionx: z.string().optional(),
          positiony: z.string().optional(),
        })
        .optional(),
    }),
});
```

## Content Frontmatter

Each content file (using .mdx format) includes frontmatter that must match the defined schema. Here's an example:

```yaml
---
title: "Daliao"
slug: "daliao"
pubDate: "2026-09-14T05:34:29.053Z"
tags: ["home"]
author: "CC Space"
image: { src: ../../assets/works/daliao/1.jpg, alt: "Daliao 1" }
description: "Large extension and internal reconfiguration of the main house."
location: "Kaohsiung"
year: "2026"
client: "Private Client"
category: Home
---
<!-- Content goes here -->
```

Empty `location`, `year` and `client` values are hidden on the detail page, and empty tags are ignored.

## Astro 7.1.5 Enhancements

The content collections in this project use Astro 7.1.5's glob loader pattern. The key benefits include:

1. **Explicit File Selection**: The `loader: glob({})` pattern provides more control over which files are included in each collection
2. **Type Safety**: Zod schemas ensure content follows the correct structure
3. **Performance**: Improved content loading and processing performance
4. **Query API**: Enhanced API for querying and filtering content

## Content Usage

Content collections are used throughout the site's components and layouts. The validated frontmatter properties become available as props that can be accessed and rendered. For example:

```astro
---
// Example from a page component
import { getCollection } from "astro:content";
const posts = await getCollection("works");
---

{
  posts.map((post) => (
    <article>
      <h2>{post.data.title}</h2>
      <p>{post.data.description}</p>
      {post.data.image && (
        <img src={post.data.image.src} alt={post.data.image.alt} />
      )}
    </article>
  ))
}
```

This structured approach enables consistent presentation, easier content management, and reliable type safety across the entire project.
