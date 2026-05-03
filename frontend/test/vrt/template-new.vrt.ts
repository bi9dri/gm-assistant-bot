import { expect, test } from "./fixtures";

test("template new — initial form", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/template/new");
  await expect(page.getByPlaceholder("テンプレート名を入力")).toBeVisible();
  await page.waitForSelector(".react-flow__viewport");
  await expect(page).toHaveScreenshot("template-new-initial.png", { fullPage: true });
});
