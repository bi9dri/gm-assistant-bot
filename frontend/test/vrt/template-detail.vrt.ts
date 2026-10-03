import { argosScreenshot } from "@argos-ci/playwright";

import { expect, test } from "./fixtures";
import { FIXTURE_TEMPLATES } from "./seed";

test("template detail — populated", async ({ page, seedDb }, testInfo) => {
  // React Flow viewer (`.react-flow__viewport`) は mobile レイアウト下では描画されない。
  // Mobile UX 対応は別 issue で扱う。
  testInfo.skip(
    testInfo.project.name.startsWith("chromium-mobile"),
    "React Flow viewer is desktop-only; mobile UX is out of scope.",
  );
  const template = FIXTURE_TEMPLATES[0]!;
  await seedDb({ templates: [template] });
  await page.goto(`/template/${template.id}`);
  await expect(page.getByPlaceholder("テンプレート名を入力")).toHaveValue(template.name);
  await page.waitForSelector(".react-flow__viewport");
  await argosScreenshot(page, "template-detail-populated");
});

test("template detail — not found", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/template/99999");
  await expect(page.getByText("テンプレートが見つかりません")).toBeVisible();
  await argosScreenshot(page, "template-detail-not-found");
});
