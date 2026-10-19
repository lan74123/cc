import { test, expect } from "@playwright/test";
import { PROJECT_PAGE } from "./pages";

test.describe("Styling canaries", () => {
  test("text column is capped at 1280px (max-w-7xl over prose)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(PROJECT_PAGE);
    const box = await page.locator("div.max-w-7xl").first().boundingBox();
    expect(box!.width).toBeLessThanOrEqual(1281);
  });

  test("custom sm breakpoint is 800px, not 640px", async ({ page }) => {
    await page.goto("/works/");
    const nav = page.locator(".desktop-nav");
    await page.setViewportSize({ width: 799, height: 900 });
    await expect(nav).toBeHidden();
    await page.setViewportSize({ width: 801, height: 900 });
    await expect(nav).toBeVisible();
  });

  test("font families resolve", async ({ page }) => {
    await page.goto(PROJECT_PAGE);
    const family = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((e) => getComputedStyle(e).fontFamily);
    expect(await family(".font-overpass-mono")).toContain("Overpass Mono");
    expect(await family(".font-inconsolata")).toContain("Inconsolata");
  });

  test(".dark sets the page background and colour scheme", async ({ page }) => {
    await page.goto("/works/");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const [bg, scheme] = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return [s.backgroundColor, s.colorScheme];
    });
    expect(bg).toBe("rgb(34, 33, 37)");
    expect(scheme).toBe("dark");
  });

  test("the page never scrolls sideways", async ({ page }) => {
    for (const width of [360, 390, 800, 1200]) {
      await page.setViewportSize({ width, height: 800 });
      for (const url of ["/works/", PROJECT_PAGE]) {
        await page.goto(url);
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(over, `${url} at ${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });
});
