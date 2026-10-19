import { test, expect } from "@playwright/test";
import { PROJECT_PAGE, RESEARCH_PAGE } from "./pages";

test.describe("Project pages", () => {
  test("hero photo is responsive and fades in", async ({ page }) => {
    await page.goto(PROJECT_PAGE);
    const hero = page.locator("#hero-image");
    await expect(hero).toHaveAttribute("srcset", /\d+w/);
    await expect(hero).toHaveAttribute("sizes", /.+/);
    await expect
      .poll(() => hero.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
  });

  test("hero is sharp on a wide screen", async ({ page }) => {
    // A portrait cover used to be capped at 1620px wide by a height limit
    // and was stretched across a 1920px screen.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(PROJECT_PAGE);
    const hero = page.locator("#hero-image");
    await expect
      .poll(() => hero.evaluate((el: HTMLImageElement) => el.complete))
      .toBe(true);
    const [natural, shown] = await hero.evaluate((el: HTMLImageElement) => [
      el.naturalWidth,
      el.clientWidth,
    ]);
    expect(natural).toBeGreaterThanOrEqual(shown);
  });

  test("title, facts and gallery render", async ({ page }) => {
    await page.goto(PROJECT_PAGE);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".work-meta")).toBeVisible();
    const gallery = page.locator(".masonry img");
    expect(await gallery.count()).toBeGreaterThan(0);
    await expect(gallery.first()).toHaveAttribute("srcset", /\.avif \d+w/);
    await expect(gallery.first()).toHaveAttribute("sizes", /.+/);
  });

  test("gallery photos match their srcset widths", async ({
    page,
    request,
  }) => {
    // Each srcset entry must be as wide as it claims, or the browser picks
    // a file that is too small.
    await page.goto(PROJECT_PAGE);
    const srcset = await page
      .locator(".masonry img")
      .first()
      .getAttribute("srcset");
    for (const part of srcset!.split(",")) {
      const [url, w] = part.trim().split(/\s+/);
      const resp = await request.get(url);
      expect(resp.status(), url).toBe(200);
      const width = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return img.naturalWidth;
      }, url);
      expect(
        Math.abs(width - parseInt(w)),
        `${url} is ${width}px, not ${w}`,
      ).toBeLessThanOrEqual(2);
    }
  });

  test("Discover more lists the route with this project marked", async ({
    page,
  }) => {
    await page.goto(PROJECT_PAGE);
    const section = page.locator(".more-section");
    test.skip((await section.count()) === 0, "only one project in this build");
    await expect(section.locator(".route-stop.is-here")).toHaveCount(1);
    await expect(
      section.locator('.route-stop.is-here [aria-current="page"]'),
    ).toHaveCount(1);
    await expect(section.locator(".more-index")).toHaveAttribute(
      "href",
      "/works/",
    );
  });

  test("research case study renders", async ({ page }) => {
    await page.goto(RESEARCH_PAGE);
    await expect(page.locator("h1")).toBeVisible();
  });
});
