import { test, expect } from "./fixtures";

test("home page baseline", async ({ page }) => {
  await page.goto("/");
  // 真っ白ページが baseline として固定される古典 footgun の防御。React mount 失敗を screenshot 前に検知する
  await expect(page.getByRole("heading", { name: /ようこそ/ })).toBeVisible();
  await expect(page).toHaveScreenshot("home.png");
});
