/**
 * Content collection definitions.
 *
 * Every entry is a folder: `src/content/<collection>/<slug>/index.mdx`
 * (or index.md) beside its photos. The folder name is the URL slug
 * (`works/daliao/` -> /works/daliao/); a `slug` field overrides it.
 * Folders whose name starts with `_` are drafts and are skipped.
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
  author: z.string().default("CC Space"),
  description: z.string(),
  location: z.string().optional(),
  year: z.string().optional(),
  client: z.string().optional(),
  category: z.enum(["Home", "Commerce"]).optional(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  slug: z.string().optional(),
  // Stand-in project for the design review: shown by `astro dev` and the
  // preview site (PUBLIC_PREVIEW=1), left out of production builds.
  placeholder: z.boolean().optional(),
};

/** One entry per folder; the folder name is the id unless `slug` is set. */
function entryLoader(collection: string) {
  return glob({
    pattern: "[^_]*/index.{md,mdx}",
    base: `./src/content/${collection}`,
    generateId: ({ entry, data }) =>
      typeof data.slug === "string" && data.slug
        ? data.slug
        : entry.split("/")[0],
  });
}

// `image` is the cover. `image.src` accepts a remote URL, a public/
// root-relative path (unoptimized), or a path relative to the entry
// (`./01.jpg`), resolved and optimized at build time via Astro's
// `image()` schema helper. The plain-string checks must come before
// `image()` in the union: `image()` tries to resolve *any* string as a
// module-graph import, which can spuriously "succeed" against a leading
// "/" public path and break it — so remote/public strings need to match
// one of the sync checks first and short-circuit before `image()` runs.
//
// `gallery` is optional: without it the page shows every photo in the
// entry's folder in file-name order (galleryFor() in collections.ts).
// List photos here only to choose their order or give each its own
// description (alt text).
const works = defineCollection({
  loader: entryLoader("works"),
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
      gallery: z
        .array(z.object({ src: image(), alt: z.string().optional() }))
        .optional(),
    }),
});

const research = defineCollection({
  loader: entryLoader("research"),
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
      gallery: z
        .array(z.object({ src: image(), alt: z.string().optional() }))
        .optional(),
    }),
});

export const collections = {
  works,
  research,
};
