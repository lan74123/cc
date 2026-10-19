import { test, expect, type Page } from "@playwright/test";
import { INDEX_PAGES } from "./pages";

// The index rows (BlogPost.astro): the route list settled with the
// client. Phones open a row in place; wide screens show it in a pane.

const openRows = (page: Page) =>
  page.$$eval(".work-card", (cards) =>
    cards.map((c) => c.classList.contains("is-open")),
  );

test.describe("Index pages", () => {
  test("rows are numbered, titled and linked", async ({ page }) => {
    for (const url of INDEX_PAGES) {
      await page.goto(url);
      const rows = page.locator(".work-card");
      expect(await rows.count(), url).toBeGreaterThan(0);
      await expect(rows.first().locator(".work-card-num")).toHaveText("01");
      const href = await rows.first().locator("h2 a").getAttribute("href");
      expect(href).toMatch(new RegExp(`^${url}[a-z0-9-]+/$`));
    }
  });

  test("row photos are responsive AVIF", async ({ page }) => {
    await page.goto("/works/");
    const big = page.locator(".work-card-big img").first();
    await expect(big).toHaveAttribute("srcset", /\.avif \d+w/);
    await expect(big).toHaveAttribute("sizes", /.+/);
  });
});

test.describe("Index on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("a tap opens a row in place and the figure closes it", async ({
    page,
  }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    await row.locator(".work-card-meta").click();
    await expect(row).toHaveClass(/is-open/);
    await expect(row.locator(".work-card-big")).toBeVisible();
    await expect(row.locator(".work-card-facts")).toBeVisible();
    const cap = row.locator(".work-card-cap");
    await expect(cap).toBeVisible();
    await cap.click();
    await expect(row).not.toHaveClass(/is-open/);
  });

  test("opening a lower row folds the open one", async ({ page }) => {
    await page.goto("/works/");
    const rows = page.locator(".work-card");
    test.skip((await rows.count()) < 2, "needs two rows (preview build)");
    await rows.nth(0).locator(".work-card-meta").click();
    await expect(rows.nth(0)).toHaveClass(/is-open/);
    const expected = Array.from(
      { length: await rows.count() },
      (_, i) => i === 1,
    );
    await rows.nth(1).locator(".work-card-meta").click();
    await expect.poll(() => openRows(page)).toEqual(expected);
  });

  test("View project walks the figure there, then opens the project", async ({
    page,
  }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    const href = await row.locator("h2 a").getAttribute("href");
    await row.locator(".work-card-meta").click();
    await row.locator(".work-card-actions .work-card-more").click();
    await expect(row.locator(".work-card-cap")).toHaveClass(/is-leaving/);
    await page.waitForURL(`**${href}`);
  });
});

test.describe("Index on a wide screen", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("starts idle with the first project in the pane", async ({ page }) => {
    await page.goto("/works/");
    await expect(page.locator(".work-list")).toHaveClass(/is-idle/);
    const first = page.locator(".work-card").first();
    await expect(first).toHaveClass(/is-open/);
    await expect(first.locator(".work-card-detail")).toBeVisible();
    await expect(first.locator(".work-card-caption")).toBeVisible();
    await expect(page.locator(".work-walker-d2")).toBeVisible();
    await expect(first.locator(".work-card-thumb")).toBeHidden();
  });

  test("pointing at a row shows it and walks the figure there", async ({
    page,
  }) => {
    await page.goto("/works/");
    const rows = page.locator(".work-card");
    test.skip((await rows.count()) < 2, "needs two rows (preview build)");
    const walkerY = () =>
      page.evaluate(() =>
        parseFloat(
          getComputedStyle(
            document.querySelector(".work-walker-d2")!,
          ).getPropertyValue("--wy"),
        ),
      );
    const before = await walkerY();
    await rows.nth(1).hover();
    await expect(rows.nth(1)).toHaveClass(/is-open/);
    await expect(page.locator(".work-list")).not.toHaveClass(/is-idle/);
    await expect.poll(walkerY).toBeGreaterThan(before);
  });

  test("clicking a row opens its project", async ({ page }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    const href = await row.locator("h2 a").getAttribute("href");
    await row.locator(".work-card-meta").click();
    await page.waitForURL(`**${href}`);
  });
});
