import { expect, test } from "./fixtures";

test("scenario document — 操作チップを空段落へドラッグで移す", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-storybook-light",
    "非視覚の操作テストは 1 プロジェクトでのみ実行する",
  );

  await page.goto("/iframe.html?id=scenario-scenariodocument--default&viewMode=story");

  const sourceParagraph = page.getByText("館に着いた頃には", { exact: false });
  await expect(sourceParagraph).toContainText("ロール作成");

  const lastParagraph = page.getByText("犯人は執事だった。");
  await expect(lastParagraph).toBeVisible();

  await page.locator(".ProseMirror").evaluate((editor) => {
    const lastBlock = editor.lastElementChild;
    if (lastBlock === null) throw new Error("本文が空");

    const caret = document.createRange();
    caret.selectNodeContents(lastBlock);
    caret.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(caret);
    editor.focus();
  });
  await page.keyboard.press("Enter");
  const emptyParagraph = page.locator(".ProseMirror > *").last();
  await expect(emptyParagraph).toHaveText("");

  await page.locator("#step-cr").getByText("ロール作成").dragTo(emptyParagraph);

  await expect(emptyParagraph).toContainText("ロール作成");
  await expect(sourceParagraph).not.toContainText("ロール作成");
});
