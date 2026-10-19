import { test, expect } from "@playwright/test";
import { ALL_PAGES } from "./pages";

test.describe("Accessibility", () => {
  test("every image has an alt attribute", async ({ page }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url);
      const missing = await page.$$eval("img", (imgs) =>
        imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.src),
      );
      expect(missing, `${url}: images without alt`).toEqual([]);
    }
  });

  test("no page has more than one h1, and no heading is empty", async ({
    page,
  }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url);
      expect(await page.locator("h1").count(), url).toBeLessThanOrEqual(1);
      const empty = await page.$$eval("h1, h2, h3, h4", (hs) =>
        hs.filter((h) => !h.textContent?.trim()).map((h) => h.outerHTML),
      );
      expect(empty, `${url}: empty headings`).toEqual([]);
    }
  });

  test("html element has lang attribute", async ({ page }) => {
    await page.goto("/works/");
    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
  });

  test("no duplicate IDs on any page", async ({ page }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url);
      const dupes = await page.evaluate(() => {
        const seen = new Map<string, number>();
        document
          .querySelectorAll("[id]")
          .forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
        return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
      });
      expect(dupes, `${url}: duplicate IDs`).toEqual([]);
    }
  });

  test("every button has an accessible name and a type", async ({ page }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url);
      const bad = await page.$$eval("button", (bs) =>
        bs
          .filter(
            (b) =>
              b.getAttribute("type") !== "button" ||
              !(b.getAttribute("aria-label") || b.textContent?.trim()),
          )
          .map((b) => b.outerHTML.slice(0, 80)),
      );
      expect(bad, url).toEqual([]);
    }
  });

  test("keyboard: Tab reaches the home link first", async ({ page }) => {
    await page.goto("/works/");
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    expect(label).toMatch(/home/i);
  });

  test("dark mode: background and text colours differ", async ({ page }) => {
    await page.goto("/works/");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const [bg, fg] = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return [s.backgroundColor, s.color];
    });
    expect(bg).not.toBe(fg);
  });
});
