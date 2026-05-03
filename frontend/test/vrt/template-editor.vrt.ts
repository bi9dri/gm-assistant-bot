import { expect, test } from "./fixtures";
import { FIXTURE_EDITOR_TEMPLATES } from "./seed";

const [singleCreateRole, singleSendMessage, singleConditionalBranch, connectedFlow] =
  FIXTURE_EDITOR_TEMPLATES;

test("template editor — single CreateRole", async ({ page, seedDb }) => {
  await seedDb({ templates: [singleCreateRole!] });
  await page.goto(`/template/${singleCreateRole!.id}`);
  await expect(page.getByPlaceholder("テンプレート名を入力")).toHaveValue(singleCreateRole!.name);
  await page.waitForSelector(".react-flow__viewport");
  await page.waitForSelector('[data-id="CreateRole-1"]');
  await expect(page).toHaveScreenshot("template-editor-single-create-role.png", {
    fullPage: true,
  });
});

test("template editor — single SendMessage", async ({ page, seedDb }) => {
  await seedDb({ templates: [singleSendMessage!] });
  await page.goto(`/template/${singleSendMessage!.id}`);
  await expect(page.getByPlaceholder("テンプレート名を入力")).toHaveValue(singleSendMessage!.name);
  await page.waitForSelector(".react-flow__viewport");
  await page.waitForSelector('[data-id="SendMessage-1"]');
  await expect(page).toHaveScreenshot("template-editor-single-send-message.png", {
    fullPage: true,
  });
});

test("template editor — single ConditionalBranch", async ({ page, seedDb }) => {
  await seedDb({ templates: [singleConditionalBranch!] });
  await page.goto(`/template/${singleConditionalBranch!.id}`);
  await expect(page.getByPlaceholder("テンプレート名を入力")).toHaveValue(
    singleConditionalBranch!.name,
  );
  await page.waitForSelector(".react-flow__viewport");
  await page.waitForSelector('[data-id="ConditionalBranch-1"]');
  await expect(page).toHaveScreenshot("template-editor-single-conditional-branch.png", {
    fullPage: true,
  });
});

test("template editor — connected flow with comment", async ({ page, seedDb }) => {
  await seedDb({ templates: [connectedFlow!] });
  await page.goto(`/template/${connectedFlow!.id}`);
  await expect(page.getByPlaceholder("テンプレート名を入力")).toHaveValue(connectedFlow!.name);
  await page.waitForSelector(".react-flow__viewport");
  await page.waitForSelector('[data-id="CreateRole-1"]');
  await page.waitForSelector('[data-id="SendMessage-1"]');
  await page.waitForSelector('[data-id="ConditionalBranch-1"]');
  await page.waitForSelector('[data-id="Comment-1"]');
  await expect(page).toHaveScreenshot("template-editor-connected-flow.png", {
    fullPage: true,
  });
});
