import { expect, test } from "./fixtures";
import { FIXTURE_BOTS } from "./seed";

test("bot list — empty", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/bot");
  await expect(page.getByText("Discord botが登録されていません")).toBeVisible();
  await expect(page).toHaveScreenshot("bot-list-empty.png", { fullPage: true });
});

test("bot list — populated", async ({ page, seedDb }) => {
  await seedDb({ bots: FIXTURE_BOTS });
  await page.goto("/bot");
  await expect(
    page.getByRole("heading", { name: FIXTURE_BOTS[0]!.name, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("bot-list-populated.png", { fullPage: true });
});
