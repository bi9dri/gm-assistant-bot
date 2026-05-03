import { expect, test } from "./fixtures";
import { FIXTURE_TEMPLATES } from "./seed";

test("template list — empty", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/template");
  await expect(page.getByText("テンプレートが作成されていません")).toBeVisible();
  await expect(page).toHaveScreenshot("template-list-empty.png", { fullPage: true });
});

test("template list — populated", async ({ page, seedDb }) => {
  await seedDb({ templates: FIXTURE_TEMPLATES });
  await page.goto("/template");
  await expect(
    page.getByRole("heading", { name: FIXTURE_TEMPLATES[0]!.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: FIXTURE_TEMPLATES[1]!.name, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("template-list-populated.png", { fullPage: true });
});
