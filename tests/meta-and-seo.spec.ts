import { test, expect } from "@playwright/test";
import { ALL_PAGES, PROJECT_PAGE } from "./pages";

test.describe("Meta tags and SEO", () => {
  test("titles read 'Page | CC Space'", async ({ page }) => {
    await page.goto("/works/");
    await expect(page).toHaveTitle("Works | CC Space");
    await page.goto(PROJECT_PAGE);
    await expect(page).toHaveTitle(/^.+ \| CC Space$/);
  });

  test("every page has a description, canonical URL and absolute og:image", async ({
    page,
  }) => {
    for (const url of ALL_PAGES) {
      await page.goto(url);
      await expect(
        page.locator('meta[name="description"]'),
        url,
      ).toHaveAttribute("content", /.+/);
      await expect(page.locator('link[rel="canonical"]'), url).toHaveAttribute(
        "href",
        new RegExp(`^https://[^/]+${url.replace(/\//g, "\/")}$`),
      );
      await expect(
        page.locator('meta[property="og:image"]'),
        url,
      ).toHaveAttribute("content", /^https?:\/\/.+\.(webp|avif|jpe?g|png)$/);
    }
  });

  test("JSON-LD is valid JSON and cannot close its script tag", async ({
    page,
  }) => {
    await page.goto(PROJECT_PAGE);
    const blocks = await page.$$eval(
      'script[type="application/ld+json"]',
      (ss) => ss.map((s) => s.textContent ?? ""),
    );
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(() => JSON.parse(b)).not.toThrow();
      expect(b).not.toContain("</script>");
    }
  });

  test("noindex only on the preview site", async ({ page }) => {
    // PUBLIC_PREVIEW=1 builds show the layout panel and must stay out of
    // search engines; production builds have neither.
    await page.goto("/works/");
    const preview = (await page.locator("#preview-switcher").count()) > 0;
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
    ).toHaveCount(preview ? 1 : 0);
  });

  test("sitemap, robots.txt and RSS feeds are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap-index.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<sitemapindex");
    expect((await request.get("/robots.txt")).status()).toBe(200);
    for (const feed of ["/works/rss.xml", "/research/rss.xml"]) {
      const resp = await request.get(feed);
      expect(resp.status(), feed).toBe(200);
      expect(await resp.text(), feed).toContain("<rss");
    }
  });
});
