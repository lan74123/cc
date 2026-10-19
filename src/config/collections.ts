import type { CollectionName } from "../scripts/collections";

export interface RouteCollection {
  /** Collection name; must match src/content.config.ts and the URL segment. */
  name: CollectionName;
  /** Title shown on the collection index page. */
  title: string;
}

/**
 * Single source of truth for every generated collection route.
 * Adding a collection here creates its index, detail, tag index, tag detail
 * and RSS routes.
 */
export const ROUTE_COLLECTIONS: readonly RouteCollection[] = [
  { name: "works", title: "Works" },
  { name: "research", title: "Research" },
] as const;

export function getRouteCollection(name: string): RouteCollection {
  const found = ROUTE_COLLECTIONS.find((c) => c.name === name);
  if (!found) throw new Error(`Unknown route collection: ${name}`);
  return found;
}
