import { test, expect } from "@playwright/test";
// Storybook の static build (`storybook-static/`) を /iframe.html 経由で開いて
// 1 ストーリ = 1 snapshot で VRT を行う。`STORY_IDS` を手書きせず
// `storybook-static/index.json` を読み取って自動列挙する。新しい *.stories.tsx
// を追加するだけで対応 snapshot が増える。

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface StoryEntry {
  id: string;
  type: "story" | "docs";
  title: string;
  name: string;
  importPath: string;
}

interface StorybookIndex {
  v: number;
  entries: Record<string, StoryEntry>;
}

const indexPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../storybook-static/index.json",
);

let storyIds: string[];
try {
  const raw = readFileSync(indexPath, "utf8");
  const index = JSON.parse(raw) as StorybookIndex;
  storyIds = Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map((entry) => entry.id)
    .sort();
} catch (error) {
  throw new Error(
    `Failed to read Storybook index at ${indexPath}. ` +
      `Run \`bun run --bun --filter gm-assistant-bot-frontend build-storybook\` first.\n${(error as Error).message}`,
  );
}

if (storyIds.length === 0) {
  throw new Error(`No stories found in ${indexPath}`);
}

for (const id of storyIds) {
  test(id, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.waitForLoadState("networkidle");
    // React Flow handle 等の DOM が確定するまで僅かに待つ。
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true });
  });
}
