import { type Page, test as base, expect } from "@playwright/test";

import type { SeedPayload } from "./seed";

interface VrtDbWindow {
  __vrtDb?: {
    Template: { bulkAdd: (rows: unknown[]) => Promise<unknown> };
    GameSession: { bulkAdd: (rows: unknown[]) => Promise<unknown> };
    DiscordBot: { bulkAdd: (rows: unknown[]) => Promise<unknown> };
    Guild: { bulkAdd: (rows: unknown[]) => Promise<unknown> };
  };
  __vrtFs?: { writeFile: (path: string, data: Blob) => Promise<void> };
}

async function applySeed(page: Page, payload: SeedPayload): Promise<void> {
  await page.evaluate(async (data) => {
    const w = window as unknown as VrtDbWindow;
    if (!w.__vrtDb) throw new Error("__vrtDb is not exposed");
    const db = w.__vrtDb;
    if (data.templates?.length) {
      await db.Template.bulkAdd(
        data.templates.map(({ createdAtIso, updatedAtIso, coverColor: _c, ...meta }) => ({
          ...meta,
          createdAt: new Date(createdAtIso),
          updatedAt: new Date(updatedAtIso),
        })),
      );

      // カバー画像は OPFS 側の seed が要る。単色 PNG を生成して coverPath へ書き込む。
      for (const t of data.templates) {
        if (!t.coverPath || !t.coverColor) continue;
        const canvas = document.createElement("canvas");
        canvas.width = 384;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("2d context is not available");
        ctx.fillStyle = t.coverColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
        });
        if (!w.__vrtFs) throw new Error("__vrtFs is not exposed");
        await w.__vrtFs.writeFile(t.coverPath, blob);
      }
    }
    if (data.bots?.length) {
      await db.DiscordBot.bulkAdd(
        data.bots.map((b) => ({ id: b.id, name: b.name, token: b.token, icon: b.icon })),
      );
    }
    if (data.guilds?.length) {
      await db.Guild.bulkAdd(data.guilds.map((g) => ({ id: g.id, name: g.name, icon: g.icon })));
    }
    if (data.sessions?.length) {
      await db.GameSession.bulkAdd(
        data.sessions.map((s) => ({
          id: s.id,
          name: s.name,
          guildId: s.guildId,
          botId: s.botId,
          gameFlags: s.gameFlags,
          reactFlowData: s.reactFlowData,
          createdAt: new Date(s.createdAtIso),
          lastUsedAt: new Date(s.lastUsedAtIso),
        })),
      );
    }
  }, payload);
}

interface VrtFixtures {
  /**
   * MSW worker と Dexie DB が起動した状態のページにナビゲートし、seed payload を
   * IndexedDB に書き込む。Playwright は test ごとに新しい browser context を
   * 作るため、IndexedDB の test 間隔離は context 機構に任せている。
   */
  seedDb: (payload: SeedPayload) => Promise<void>;
}

/**
 * playwright.config.ts の `project.use.theme` 経由で worker scope に渡される。
 * - `localStorage.theme` を介して ThemeProvider の `data-theme` (DaisyUI) を制御
 * - `colorScheme` (use 側) は `prefers-color-scheme` を介して Tailwind `dark:` バリアントを制御
 *
 * 両者を同時に揃えないと `data-theme="dark"` だが `dark:bg-...` が効かない不整合が発生する。
 */
export interface VrtWorkerOptions {
  theme: "light" | "dark";
}

export const test = base.extend<VrtFixtures, VrtWorkerOptions>({
  theme: ["light", { option: true, scope: "worker" }],

  context: async ({ context, theme }, use) => {
    // ThemeProvider は module-load 時に `localStorage.getItem("theme")` を読むため、
    // page スクリプト実行前に initScript で localStorage を仕込む必要がある。
    await context.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
      } catch {
        // ignore — Playwright context では throw しない想定
      }
    }, theme);
    await use(context);
  },

  seedDb: async ({ page }, use) => {
    await page.goto("/");
    await page.waitForFunction(() => "__vrtDb" in window && "__vrtFs" in window);

    await use(async (payload: SeedPayload) => {
      await applySeed(page, payload);
    });
  },
});

export { expect };
