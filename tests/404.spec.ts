import { test, expect } from "@playwright/test";

test.describe("404 page", () => {
  test("renders with a way back to the works", async ({ page }) => {
    await page.goto("/404.html");
    await expect(page.locator("h1")).toHaveText("404");
    await expect(page.locator('main a[href="/works/"]')).toBeVisible();
  });
});
