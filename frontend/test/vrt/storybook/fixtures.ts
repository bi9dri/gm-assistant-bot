import { test as base, expect } from "@playwright/test";

import type { VrtWorkerOptions } from "../fixtures";

/**
 * Storybook 用の theme worker option。
 *
 * Routes 用 (`../fixtures.ts`) と異なり `addInitScript` は使わない。`@storybook/addon-themes` の
 * `withThemeByDataAttribute` decorator は URL globals (`?globals=theme:dark`) で切り替わるため、
 * test 側で URL に append するだけで `data-theme` 属性が設定される。
 */
export const test = base.extend<{}, VrtWorkerOptions>({
  theme: ["light", { option: true, scope: "worker" }],
});

export { expect };
