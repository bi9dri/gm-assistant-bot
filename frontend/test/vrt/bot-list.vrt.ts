import { argosScreenshot } from "@argos-ci/playwright";

import { expect, test } from "./fixtures";
import { FIXTURE_BOTS } from "./seed";

test("bot list — empty", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/bot");
  await expect(page.getByText("Discord botが登録されていません")).toBeVisible();
  await argosScreenshot(page, "bot-list-empty", { fullPage: true });
});

test("bot list — populated", async ({ page, seedDb }) => {
  await seedDb({ bots: FIXTURE_BOTS });
  await page.goto("/bot");
  await expect(
    page.getByRole("heading", { name: FIXTURE_BOTS[0]!.name, exact: true }),
  ).toBeVisible();
  await argosScreenshot(page, "bot-list-populated", { fullPage: true });
});
