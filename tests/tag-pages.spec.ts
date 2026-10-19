import { test, expect } from "@playwright/test";
import { TAGS_PAGE, TAG_PAGE } from "./pages";

test.describe("Tag pages", () => {
  test("tags page shows one random photo per tag", async ({ page }) => {
    await page.goto(TAGS_PAGE);
    const img = page.locator(".randomimage img").first();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("srcset", /\d+w/);
    await expect(img).toHaveAttribute("sizes", /800px/);
    const raw = await page
      .locator(".randomimage")
      .first()
      .getAttribute("data-images");
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty("srcset");
  });

  test("tag links point to tag pages", async ({ page }) => {
    await page.goto(TAGS_PAGE);
    const hrefs = await page.$$eval(".randomimage a", (as) =>
      as.map((a) => a.getAttribute("href")),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(h).toMatch(/^\/works\/tags\/[^/]+\/$/);
  });

  test("a tag page lists its entries", async ({ page }) => {
    await page.goto(TAG_PAGE);
    expect(await page.locator(".work-card").count()).toBeGreaterThan(0);
  });
});
