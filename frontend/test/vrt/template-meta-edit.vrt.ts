import { expect, test } from "./fixtures";
import { FIXTURE_TEMPLATES } from "./seed";

// メタ情報の編集は保存 → 表示 → 再編集 → クリアまで通しで確認する (スナップショットなし)。
test("template meta — 編集の往復", async ({ page, seedDb }) => {
  await seedDb({ templates: FIXTURE_TEMPLATES });
  await page.goto("/template");
  await page.getByRole("button", { name: "メタ情報" }).first().click();
  await page.getByRole("textbox").first().fill("クトゥルフ神話TRPG");
  await page.getByLabel("プレイヤー人数の下限").fill("2");
  await page.getByLabel("プレイヤー人数の上限").fill("4");
  await page.getByLabel("所要時間の下限").fill("120");
  await page.getByLabel("所要時間の上限").fill("180");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("2人〜4人")).toBeVisible();
  await expect(page.getByText("2時間〜3時間")).toBeVisible();
  // 保存後に再度開くと値が復元される
  await page.getByRole("button", { name: "メタ情報" }).first().click();
  await expect(page.getByLabel("プレイヤー人数の上限")).toHaveValue("4");
  // クリアできる
  await page.getByLabel("プレイヤー人数の上限").fill("");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("2人以上")).toBeVisible();
});
