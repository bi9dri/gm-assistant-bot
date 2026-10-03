import { argosScreenshot } from "@argos-ci/playwright";

import { expect, test } from "./fixtures";

test("home route", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /GameMaster/ })).toBeVisible();
  await argosScreenshot(page, "home");
});
