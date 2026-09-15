/**
 * Content collection definitions.
 *
 * Uses Astro's glob loader to select MDX files; filenames starting with
 * `_` are excluded (drafts).
 */
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

// Fields shared by every collection. Kept as a plain object (not a zod
// schema built from a factory function) so each collection's `schema:
// ({ image }) => ...` stays inline — that's what lets `image`'s real type
// flow in from defineCollection's context instead of widening to `any`.
const baseFields = {
  title: z.string(),
  tags: z.array(z.string()).optional(),
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

// `image.src` accepts a remote URL (existing CDN-hosted content), a
// public/ root-relative path (unoptimized), or a path to a local file
// under `src/`, resolved and optimized at build time via Astro's
// `image()` schema helper. The plain-string checks must come before
// `image()` in the union: `image()` tries to resolve *any* string as a
// module-graph import, which can spuriously "succeed" against a leading
// "/" public path and break it — so remote/public strings need to match
// one of the sync checks first and short-circuit before `image()` runs.
const works = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/works" }),
  schema: ({ image }) =>
    z.object({
      ...baseFields,
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

const research = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/research" }),
  schema: ({ image }) =>
    z.object({
      ...baseFields,
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

export const collections = {
  works,
  research,
};
