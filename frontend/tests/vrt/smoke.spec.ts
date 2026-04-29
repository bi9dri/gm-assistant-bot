import { test, expect } from "./fixtures";

test("home page baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("home.png");
});
