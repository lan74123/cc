import { test, expect } from "@playwright/test";
import { PROJECT_PAGE } from "./pages";

test.describe("ScrollToTop", () => {
  test("hidden at the top, shown after scrolling, scrolls back up", async ({
    page,
  }) => {
    await page.goto(PROJECT_PAGE);
    const btn = page.getByRole("button", { name: "Scroll to top" });
    await expect(btn).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(btn).toBeVisible();
    await btn.click();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(50);
  });
});

test.describe("islands survive client-side navigation (ClientRouter)", () => {
  // Vanilla islands that attach listeners at script top level go dead after
  // a view-transition swap; page.goto() cannot catch this, only a real
  // in-app navigation does.
  const navigateIn = async (page: import("@playwright/test").Page) => {
    await page.goto("/works/");
    await page.locator(`.work-card h2 a[href="${PROJECT_PAGE}"]`).click();
    await page.waitForURL(`**${PROJECT_PAGE}`);
  };

  test("hamburger still works", async ({ page }) => {
    // On phones a tap on an index row opens it in place, so go through the
    // menu instead: open it, follow a link, then use it again.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/works/");
    const hamburger = page.getByRole("button", {
      name: /open menu|close menu/i,
    });
    await hamburger.click();
    await page.locator('#nav-links a[href="/about/"]').click();
    await page.waitForURL("**/about/");
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#nav-links")).toHaveClass(/open/);
  });

  test("theme toggle still works", async ({ page }) => {
    await navigateIn(page);
    const toggle = page.getByRole("button", {
      name: /switch to (light|dark) theme/i,
    });
    const before = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    await toggle.click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        ),
      )
      .toBe(!before);
  });

  test("hero photo is visible", async ({ page }) => {
    await navigateIn(page);
    await expect
      .poll(() =>
        page
          .locator("#hero-image")
          .evaluate((el) => getComputedStyle(el).opacity),
      )
      .toBe("1");
  });
});
