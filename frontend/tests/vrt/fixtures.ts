import { test as base, expect } from "@playwright/test";

// 真っ白 baseline 防御: pageerror と console.error を収集し、検知したら test を fail させる。
// 本 fixture の責務はこれだけ。MSW per-test handler override / IDB cleanup / readiness wait は #152
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      errors.push(`pageerror: ${e.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });
    await use(page);
    if (errors.length > 0) {
      throw new Error(`Page errors detected:\n${errors.join("\n")}`);
    }
  },
});

export { expect };
