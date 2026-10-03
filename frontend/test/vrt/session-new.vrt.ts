import { argosScreenshot } from "@argos-ci/playwright";

import { expect, test } from "./fixtures";
import { FIXTURE_BOTS, FIXTURE_TEMPLATES } from "./seed";

test("session new — without bots", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/session/new");
  await expect(page.getByText("新しいセッションを作成する")).toBeVisible();
  await argosScreenshot(page, "session-new-empty");
});

test("session new — with bot and templates", async ({ page, seedDb }) => {
  await seedDb({ bots: FIXTURE_BOTS, templates: FIXTURE_TEMPLATES });
  await page.goto("/session/new");
  await expect(page.getByText("新しいセッションを作成する")).toBeVisible();
  await expect(page.getByRole("option", { name: FIXTURE_BOTS[0]!.name })).toBeAttached();
  await argosScreenshot(page, "session-new-populated");
});
