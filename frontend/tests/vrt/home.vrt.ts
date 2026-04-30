import { test, expect } from "./msw/fixture";

test("home route renders the welcome heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /GameMaster's Assistant/ }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });
});
