import { expect, test } from "./fixtures";
import { FIXTURE_META_TEMPLATES, FIXTURE_TEMPLATES } from "./seed";

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

test("template list — メタ情報あり", async ({ page, seedDb }) => {
  await seedDb({ templates: FIXTURE_META_TEMPLATES });
  await page.goto("/template");
  await expect(page.getByRole("heading", { name: "メタ情報つきシナリオ" })).toBeVisible();
  await expect(page.getByRole("img").first()).toBeVisible();
  await expect(page).toHaveScreenshot("template-list-meta.png", { fullPage: true });
});

test("template list — 絞り込み適用", async ({ page, seedDb }) => {
  await seedDb({ templates: FIXTURE_META_TEMPLATES });
  await page.goto("/template");
  await page.getByLabel("プレイヤー人数で絞り込む").fill("3");
  await page.getByLabel("所要時間で絞り込む").selectOption("180");
  // 6人〜 / 5〜6時間 と メタ情報なし が落ち、1 件だけ残る
  await expect(page.getByRole("heading", { name: "メタ情報つきシナリオ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "大人数・長時間シナリオ" })).toBeHidden();
  await expect(page).toHaveScreenshot("template-list-filtered.png", { fullPage: true });
});

test("template list — 絞り込み結果が0件", async ({ page, seedDb }) => {
  await seedDb({ templates: FIXTURE_META_TEMPLATES });
  await page.goto("/template");
  // 1 人: 2〜4 人 / 6 人以上 のどちらにも該当せず、メタ情報なしも除外される
  await page.getByLabel("プレイヤー人数で絞り込む").fill("1");
  await expect(page.getByText("条件に合うテンプレートがありません")).toBeVisible();
  await expect(page).toHaveScreenshot("template-list-filtered-empty.png", { fullPage: true });
});
