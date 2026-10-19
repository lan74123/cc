import { test, expect } from "@playwright/test";

const isDark = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.classList.contains("dark"));

test.describe("Theme", () => {
  test("toggle flips the theme, its label and the browser bar colour", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/works/");
    const toggle = page.getByRole("button", { name: /Switch to/ });
    await toggle.click();
    await expect.poll(() => isDark(page)).toBe(true);
    await expect(toggle).toHaveAttribute("aria-label", /Switch to light/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#222125",
    );
    await toggle.click();
    await expect.poll(() => isDark(page)).toBe(false);
    await expect(toggle).toHaveAttribute("aria-label", /Switch to dark/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f2f2f2",
    );
  });

  test("sun rays show only in dark mode", async ({ page }) => {
    // The rays' hidden state must live in the stylesheet, not an inline
    // style, or the html.dark rule can never show them.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/works/");
    const rays = page.locator("#theme-toggle-rays");
    await expect
      .poll(() => rays.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("0");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect
      .poll(() => rays.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
  });

  test("a stored choice persists across pages", async ({ page }) => {
    await page.goto("/works/");
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.goto("/about/");
    await expect.poll(() => isDark(page)).toBe(true);
  });

  test("dark theme is applied before the first paint (no light flash)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const w = window as unknown as { __firstBody?: boolean };
        if (document.body && w.__firstBody === undefined) {
          w.__firstBody = document.documentElement.classList.contains("dark");
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/works/");
    expect(
      await page.evaluate(
        () => (window as unknown as { __firstBody?: boolean }).__firstBody,
      ),
    ).toBe(true);
  });
});
