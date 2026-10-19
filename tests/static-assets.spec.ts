import { test, expect } from "@playwright/test";
import { ALL_PAGES } from "./pages";

test.describe("Static assets and build output", () => {
  test("favicons are served", async ({ request }) => {
    for (const f of ["/favicon.svg", "/favicon.ico", "/apple-touch-icon.png"]) {
      expect((await request.get(f)).status(), f).toBe(200);
    }
  });

  test("no JavaScript errors on any page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`${page.url()}: ${err.message}`));
    for (const url of ALL_PAGES) {
      await page.goto(url, { waitUntil: "networkidle" });
    }
    expect(errors).toEqual([]);
  });

  test("optimized images are AVIF", async ({ page }) => {
    await page.goto("/works/");
    const srcs = await page.$$eval(
      'img[src*="/_astro/"]:not([src$=".svg"])',
      (imgs) => imgs.map((i) => i.getAttribute("src")),
    );
    expect(srcs.length).toBeGreaterThan(0);
    for (const s of srcs) expect(s).toMatch(/\.avif$/);
  });

  test("no broken internal links on the index", async ({ page }) => {
    await page.goto("/works/");
    const hrefs = await page.$$eval("a[href^='/']", (as) => [
      ...new Set(as.map((a) => a.getAttribute("href")!)),
    ]);
    const broken: string[] = [];
    for (const href of hrefs) {
      const resp = await page.request.get(href);
      if (resp.status() >= 400) broken.push(`${href} → ${resp.status()}`);
    }
    expect(broken).toEqual([]);
  });
});
