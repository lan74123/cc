import rss from "@astrojs/rss";
import { getCollection, type CollectionEntry } from "astro:content";
import sanitizeHtml from "sanitize-html";
import MarkdownIt from "markdown-it";
import type { ImageMetadata } from "astro";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import type { Props as WorkCardProps } from "../components/WorkCard.astro";

const parser = new MarkdownIt();

/**
 * Strip MDX-only syntax (ESM import/export lines and capitalised JSX
 * components such as `<MasonryLayout ... />`) so markdown-it does not
 * render them as literal text in the feed.
 */
function stripMdx(body: string): string {
  return body
    .replace(/^\s*(import|export)\s.*$/gm, "")
    .replace(/<([A-Z][\w.]*)\b[\s\S]*?(\/>|<\/\1>)/g, "");
}

/** Valid content collection names for use with getCollection(). */
export type CollectionName = "works" | "research";

/** An entry of any route collection, as getEntries() returns it. */
export type Entry = CollectionEntry<CollectionName>;

/** Placeholder entries show in dev and on the preview site only. */
const SHOW_PLACEHOLDERS =
  import.meta.env.DEV || import.meta.env.PUBLIC_PREVIEW === "1";

/**
 * A collection's entries as this build should show them: every entry in
 * dev and preview builds, and no `placeholder: true` stand-ins in
 * production. Use this instead of getCollection() for anything a visitor
 * sees (pages, tags, RSS, "Discover more").
 */
export function getEntries<C extends CollectionName>(name: C) {
  return getCollection(name, (entry) =>
    SHOW_PLACEHOLDERS ? true : !entry.data.placeholder,
  );
}

/**
 * Props for one WorkCard row on an index or tag page; `index` is the
 * row's 1-based position in the list.
 */
export function workCardProps(
  post: Entry,
  collectionSlug: string,
  index: number,
): WorkCardProps {
  const { data } = post;
  return {
    index,
    url: `/${collectionSlug}/${post.id}/`,
    image: data.image?.src || "",
    alt: data.image?.alt || "",
    title: data.title,
    description: data.description,
    category: data.category,
    year: data.year,
    location: data.location,
    positionx: data.image?.positionx || "",
    positiony: data.image?.positiony || "",
  };
}

/** Shared shape of a content collection entry used across all collections. */
interface CollectionPost {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    tags?: string[];
    pubDate: Date;
    updatedDate?: Date;
    author: string;
    image?: {
      src: string | ImageMetadata;
      alt: string;
      positionx?: string;
      positiony?: string;
    };
  };
}

/**
 * Build static paths for a collection's [...id] detail pages.
 * Generic so the original Astro collection entry type is preserved
 * (required by `render()`).
 */
export function buildDetailPaths<T extends CollectionPost>(entries: T[]) {
  return entries.map((entry) => ({
    params: { id: entry.id },
    props: { entry },
  }));
}

/**
 * Build static paths for a collection's tags/[tag] pages.
 */
export function buildTagPaths<T extends CollectionPost>(
  entries: T[],
  collectionSlug: string,
) {
  const uniqueTags = [
    ...new Set(
      entries.flatMap((post) => (post.data.tags ?? []).filter(Boolean)),
    ),
  ];
  return uniqueTags.map((tag: string) => {
    const filteredPosts = entries.filter((post) =>
      (post.data.tags ?? []).includes(tag),
    );
    return {
      params: { tag },
      props: { posts: filteredPosts, collectionSlug },
    };
  });
}

/**
 * Generate an RSS feed for a collection.
 */
export function generateRss(
  entries: CollectionPost[],
  collectionSlug: string,
  context: { site?: URL },
) {
  if (!context.site) {
    throw new Error("site must be defined in astro.config for RSS generation");
  }
  return rss({
    stylesheet: "/rss/rss.xsl",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: [...entries]
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((post) => ({
        ...post.data,
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/${collectionSlug}/${post.id}/`,
        content: sanitizeHtml(parser.render(stripMdx(post.body ?? ""))),
      })),
    customData: `<language>en-us</language>`,
  });
}
