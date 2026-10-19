import { test, expect } from "@playwright/test";
import { PROJECT_PAGE } from "./pages";

test.describe("Lightbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROJECT_PAGE);
    await page.locator("a.lightbox-link").first().click();
    await expect(page.locator(".lightbox-overlay")).toBeVisible();
  });

  test("close button dismisses the overlay", async ({ page }) => {
    await page.locator(".lightbox-close").click();
    await expect(page.locator(".lightbox-overlay")).toBeHidden();
  });

  test("Escape dismisses the overlay", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.locator(".lightbox-overlay")).toBeHidden();
  });

  test("arrow keys move between photos", async ({ page }) => {
    test.skip((await page.locator("a.lightbox-link").count()) < 2, "one photo");
    const img = page.locator(".lightbox-img");
    const first = await img.getAttribute("src");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => img.getAttribute("src")).not.toBe(first);
  });

  test("a drag released outside the photo does not stick", async ({ page }) => {
    const box = await page.locator(".lightbox-img").boundingBox();
    test.skip(!box, "no photo box");
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(10, 10);
    await page.mouse.up();
    await page.keyboard.press("Escape");
    await expect(page.locator(".lightbox-overlay")).toBeHidden();
  });
});
