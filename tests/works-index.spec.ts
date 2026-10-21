import { test, expect, type Page } from "@playwright/test";
import { INDEX_PAGES } from "./pages";

// The index rows (WorkCard.astro): the route list settled with the
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

  test("a row's title tells screen readers whether it is open", async ({
    page,
  }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    const title = row.locator("h2 a");
    await expect(title).toHaveAttribute("aria-expanded", "false");
    await row.locator(".work-card-meta").click();
    await expect(title).toHaveAttribute("aria-expanded", "true");
  });

  test("turning to a wide screen shows the first project in the pane", async ({
    page,
  }) => {
    await page.goto("/works/");
    await page.locator(".work-card-meta").first().click();
    await page.setViewportSize({ width: 1133, height: 744 });
    const first = page.locator(".work-card").first();
    await expect(page.locator(".work-list")).toHaveClass(/is-idle/);
    await expect(first).toHaveClass(/is-open/);
    await expect(first.locator(".work-card-detail")).toBeVisible();
    await expect(first.locator("h2 a")).not.toHaveAttribute("aria-expanded");
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

  test("the figure faces the reader's scrolling, not jitter or the script's", async ({
    page,
  }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    await row.locator(".work-card-meta").click();
    const cap = row.locator(".work-card-cap");
    const scrollTo = async (y: number, hold = false) => {
      await page.evaluate(
        ([top, held]) => {
          if (held)
            document.documentElement.setAttribute("data-scroll-hold", "");
          window.scrollTo({ top: Number(top), behavior: "instant" });
        },
        [y, hold],
      );
      // Let the scroll event run before the next step.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => r(null))),
      );
    };
    await scrollTo(200);
    await expect(cap).not.toHaveClass(/is-left/);
    // A couple of pixels back is jitter: still facing down the page.
    await scrollTo(198);
    await expect(cap).not.toHaveClass(/is-left/);
    // A scroll made to hold a row still does not turn it.
    await scrollTo(100, true);
    await expect(cap).not.toHaveClass(/is-left/);
    await page.evaluate(() =>
      document.documentElement.removeAttribute("data-scroll-hold"),
    );
    // The reader scrolling back up does.
    await scrollTo(60);
    await expect(cap).toHaveClass(/is-left/);
  });

  test("View project walks the figure there, then opens the project", async ({
    page,
  }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    const href = await row.locator("h2 a").getAttribute("href");
    await row.locator(".work-card-meta").click();
    const cap = row.locator(".work-card-cap");
    // Scrolling back up turns the figure up the page...
    await expect(page.locator("html")).not.toHaveAttribute("data-scroll-hold");
    for (const top of [300, 200]) {
      await page.evaluate((y) => {
        window.scrollTo({ top: y, behavior: "instant" });
        return new Promise((r) => requestAnimationFrame(() => r(null)));
      }, top);
    }
    await expect(cap).toHaveClass(/is-left/);
    // Tapped where it is: a click() would scroll it into view first,
    // and that scroll alone would turn the figure.
    await row
      .locator(".work-card-actions .work-card-more")
      .dispatchEvent("click");
    await expect(cap).toHaveClass(/is-leaving/);
    // ...but it walks to the sign facing it.
    await expect(cap).not.toHaveClass(/is-left/);
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

  test("only the shown project's large photo loads up front", async ({
    page,
  }) => {
    await page.goto("/works/");
    const rows = page.locator(".work-card");
    test.skip((await rows.count()) < 2, "needs two rows (preview build)");
    const loaded = (i: number) =>
      rows
        .nth(i)
        .locator(".work-card-big img")
        .evaluate((img: HTMLImageElement) => img.currentSrc !== "");
    await expect.poll(() => loaded(0)).toBe(true);
    await page.waitForLoadState("networkidle");
    expect(await loaded(1)).toBe(false);
    await rows.nth(1).hover();
    await expect.poll(() => loaded(1)).toBe(true);
  });

  test("tabbing to a row shows it in the pane", async ({ page }) => {
    await page.goto("/works/");
    const rows = page.locator(".work-card");
    test.skip((await rows.count()) < 2, "needs two rows (preview build)");
    await rows.nth(0).locator("h2 a").focus();
    // Tab past the first row's own pane link to the second row's title.
    const second = rows.nth(1).locator("h2 a");
    for (let i = 0; i < 5; i++) {
      if (await second.evaluate((a) => a === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(second).toBeFocused();
    await expect(rows.nth(1)).toHaveClass(/is-open/);
    await expect(rows.nth(0)).not.toHaveClass(/is-open/);
  });

  test("clicking a row opens its project", async ({ page }) => {
    await page.goto("/works/");
    const row = page.locator(".work-card").first();
    const href = await row.locator("h2 a").getAttribute("href");
    await row.locator(".work-card-meta").click();
    await page.waitForURL(`**${href}`);
  });
});
