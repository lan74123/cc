/**
 * Content collection definitions.
 *
 * Uses Astro's glob loader to select MDX files; filenames starting with
 * `_` are excluded (drafts).
 */
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const works = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/works" }),
  // Defined inline (rather than as a named const) so `image`'s real type
  // flows in from defineCollection's context instead of widening to `any`.
  //
  // `image.src` accepts a remote URL (existing CDN-hosted content), a
  // public/ root-relative path (unoptimized), or a path to a local file
  // under `src/`, resolved and optimized at build time via Astro's
  // `image()` schema helper. The plain-string checks must come before
  // `image()` in the union: `image()` tries to resolve *any* string as a
  // module-graph import, which can spuriously "succeed" against a leading
  // "/" public path and break it — so remote/public strings need to match
  // one of the sync checks first and short-circuit before `image()` runs.
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tags: z.array(z.string()),
      author: z.string(),
      description: z.string(),
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
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      slug: z.string().optional(),
      readingTimeMs: z.number().optional(),
    }),
});

export const collections = {
  works,
};
