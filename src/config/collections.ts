import type { CollectionName } from "../scripts/collections";

export interface RouteCollection {
  /** Collection name; must match src/content.config.ts and the URL segment. */
  name: CollectionName;
  /** Title shown on the collection index page. */
  title: string;
  /** Layout used by the detail route. */
  layout: "post" | "author";
  /** Whether list cards and the detail page show reading time. */
  readingTime: boolean;
}

/**
 * Single source of truth for every generated collection route.
 * Adding a collection here creates its index, detail, tag index, tag detail
 * and RSS routes.
 */
export const ROUTE_COLLECTIONS: readonly RouteCollection[] = [
  { name: "works", title: "Works", layout: "post", readingTime: true },
] as const;

export function getRouteCollection(name: string): RouteCollection {
  const found = ROUTE_COLLECTIONS.find((c) => c.name === name);
  if (!found) throw new Error(`Unknown route collection: ${name}`);
  return found;
}
