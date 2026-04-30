import { test as base, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handlers } from "./handlers";

const here = path.dirname(fileURLToPath(import.meta.url));

// MSW IIFE bundle exposes `window.MockServiceWorker` (setupWorker, http, HttpResponse, ...).
// addInitScript でページ実行前に注入し、Service Worker 経由で /api をモックする。
const mswIifePath = path.resolve(here, "../../../node_modules/msw/lib/iife/index.js");

// 現状はハンドラ件数だけブラウザ側に渡し、worker の初期化シグナルとして使う。
// 個別ハンドラは将来 IIFE ビルドや per-test page.route で注入する。
const handlerCount = handlers.length;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript({ path: mswIifePath });
    await page.addInitScript(async (count) => {
      const { setupWorker } = (
        window as unknown as { MockServiceWorker: typeof import("msw/browser") }
      ).MockServiceWorker;
      const worker = setupWorker();
      await worker.start({
        onUnhandledRequest: "bypass",
        quiet: true,
      });
      (window as unknown as { __mswHandlerCount: number }).__mswHandlerCount = count;
    }, handlerCount);
    await use(page);
  },
});

export { expect };
