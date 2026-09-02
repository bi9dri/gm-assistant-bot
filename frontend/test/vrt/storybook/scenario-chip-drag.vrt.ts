import { expect, test } from "./fixtures";

// 文中の操作チップは DnD で任意のブロックへ動かせる (docs: scenario-editor-architecture D24)。
// 空段落は「本文を書く前に置き場所だけ作る」典型の落とし先なので、移動先に選ぶ。
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

  // 末尾に空段落を作る。キャレットはクリックに任せず DOM 選択で置く。段落の余白を
  // クリックしてもキャレットが伴わないことがあり、その場合 Enter は文書の先頭で起きる。
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
  // 複製ではなく移動であること。
  await expect(sourceParagraph).not.toContainText("ロール作成");
});
