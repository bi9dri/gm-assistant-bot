import { expect, test } from "./fixtures";
import { FIXTURE_BOTS, FIXTURE_GUILDS, FIXTURE_SESSIONS } from "./seed";

test("session detail — populated", async ({ page, seedDb }, testInfo) => {
  // React Flow viewer (`.react-flow__viewport`) は mobile レイアウト下では描画されない。
  // Mobile UX 対応は別 issue で扱う。
  testInfo.skip(
    testInfo.project.name === "chromium-mobile",
    "React Flow viewer is desktop-only; mobile UX is out of scope.",
  );
  const session = FIXTURE_SESSIONS[0]!;
  await seedDb({
    sessions: [session],
    guilds: FIXTURE_GUILDS,
    bots: FIXTURE_BOTS,
  });
  await page.goto(`/session/${session.id}`);
  await expect(page.getByPlaceholder("セッション名を入力")).toHaveValue(session.name);
  await page.waitForSelector(".react-flow__viewport");
  await expect(page).toHaveScreenshot("session-detail-populated.png", { fullPage: true });
});

test("session detail — not found", async ({ page, seedDb }) => {
  await seedDb({});
  await page.goto("/session/99999");
  await expect(page.getByText("セッションが見つかりません")).toBeVisible();
  await expect(page).toHaveScreenshot("session-detail-not-found.png", { fullPage: true });
});
