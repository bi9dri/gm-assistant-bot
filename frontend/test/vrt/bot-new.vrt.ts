import { expect, test } from "./fixtures";

test("bot new — initial token form", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/bot/new");
  await expect(page.getByText("新しいBotを追加")).toBeVisible();
  await expect(page.getByPlaceholder("Bot Tokenを入力してください")).toBeVisible();
  await expect(page).toHaveScreenshot("bot-new-initial.png", { fullPage: true });
});
