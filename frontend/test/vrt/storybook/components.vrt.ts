import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "./fixtures";

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
      `Run \`pnpm --filter gm-assistant-bot-frontend build-storybook\` first.\n${(error as Error).message}`,
  );
}

if (storyIds.length === 0) {
  throw new Error(`No stories found in ${indexPath}`);
}

for (const id of storyIds) {
  test(id, async ({ page, theme }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#storybook-root > *").first().waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true });
  });
}
