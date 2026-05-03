import { expect, test } from "./fixtures";
import { FIXTURE_GUILDS, FIXTURE_SESSIONS } from "./seed";

test("session list — empty", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/session");
  await expect(page.getByText("セッションが作成されていません")).toBeVisible();
  await expect(page).toHaveScreenshot("session-list-empty.png", { fullPage: true });
});

test("session list — populated", async ({ page, seedDb }) => {
  await seedDb({ sessions: FIXTURE_SESSIONS, guilds: FIXTURE_GUILDS });
  await page.goto("/session");
  await expect(
    page.getByRole("heading", { name: FIXTURE_SESSIONS[0]!.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: FIXTURE_SESSIONS[1]!.name, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("session-list-populated.png", { fullPage: true });
});
