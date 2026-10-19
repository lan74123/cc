import { test, expect } from "@playwright/test";

const LINKS = ["/works/", "/research/", "/about/", "/contact/"];

test.describe("Navigation", () => {
  test("desktop header shows every section and marks the current one", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/research/");
    for (const href of LINKS) {
      await expect(
        page.locator(`.desktop-nav a[href="${href}"]`),
      ).toBeVisible();
    }
    await expect(
      page.locator('.desktop-nav a[aria-current="page"]'),
    ).toHaveAttribute("href", "/research/");
    await expect(page.getByRole("button", { name: /menu/i })).toBeHidden();
  });

  test("phone menu opens, closes on Escape, and navigates", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/works/");
    await expect(page.locator(".desktop-nav")).toBeHidden();
    const hamburger = page.getByRole("button", { name: /menu/i });
    const nav = page.locator("#nav-links");
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await expect(hamburger).toHaveAttribute("aria-controls", "nav-links");
    expect(await nav.evaluate((el) => el.hasAttribute("inert"))).toBe(true);

    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toHaveClass(/open/);
    expect(await nav.evaluate((el) => el.hasAttribute("inert"))).toBe(false);

    await page.keyboard.press("Escape");
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    expect(await nav.evaluate((el) => el.hasAttribute("inert"))).toBe(true);

    await hamburger.click();
    await nav.locator('a[href="/about/"]').click();
    await page.waitForURL("**/about/");
  });

  test("footer: copyright and Instagram link opened safely", async ({
    page,
  }) => {
    await page.goto("/works/");
    const footer = page.locator("footer");
    await expect(footer).toContainText(
      /© \d{4} CC Space\. All rights reserved\./,
    );
    const ig = footer.locator('a[href*="instagram.com"]');
    await expect(ig).toHaveAttribute("target", "_blank");
    await expect(ig).toHaveAttribute("rel", /noopener/);
  });
});
