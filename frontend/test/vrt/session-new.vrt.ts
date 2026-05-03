import { expect, test } from "./fixtures";
import { FIXTURE_BOTS, FIXTURE_TEMPLATES } from "./seed";

test("session new — without bots", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/session/new");
  await expect(page.getByText("新しいセッションを作成する")).toBeVisible();
  await expect(page).toHaveScreenshot("session-new-empty.png", { fullPage: true });
});

test("session new — with bot and templates", async ({ page, seedDb }) => {
  await seedDb({ bots: FIXTURE_BOTS, templates: FIXTURE_TEMPLATES });
  await page.goto("/session/new");
  await expect(page.getByText("新しいセッションを作成する")).toBeVisible();
  await expect(page.getByRole("option", { name: FIXTURE_BOTS[0]!.name })).toBeAttached();
  await expect(page).toHaveScreenshot("session-new-populated.png", { fullPage: true });
});
