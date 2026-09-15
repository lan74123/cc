/**
 * Fisher-Yates shuffle — returns a new shuffled copy of the array.
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format a Date into "Mon DD, YYYY HH:MM:SS" style
 * (e.g. "Jan 15, 2025 14:30:05"). Second precision is intentional;
 * milliseconds are not shown.
 * Returns undefined if the input is nullish.
 */
export function formatDate(
  date: Date | undefined | null,
  options?: { month?: "short" | "long" },
): string | undefined {
  if (!date) return undefined;
  const datePart = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: options?.month ?? "short",
    day: "numeric",
  });
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}
