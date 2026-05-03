import { expect, test } from "./fixtures";

// React Flow editor は touch UI と小幅 viewport を想定していない。Mobile UX 対応は別 issue。
// 空 destructure は Playwright が「fixture を要求しない」と認識するための慣用形。
// oxlint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  testInfo.skip(
    testInfo.project.name.startsWith("chromium-mobile"),
    "Template editor (React Flow) is desktop-only; mobile UX is out of scope.",
  );
});

test("template new — initial form", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/template/new");
  await expect(page.getByPlaceholder("テンプレート名を入力")).toBeVisible();
  await page.waitForSelector(".react-flow__viewport");
  await expect(page).toHaveScreenshot("template-new-initial.png", { fullPage: true });
});
