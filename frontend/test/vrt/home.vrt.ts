import { expect, test } from "./fixtures";

test("home route", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /GameMaster/ })).toBeVisible();
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });
});
