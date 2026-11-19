import { test as base, expect } from "@playwright/test";

import type { VrtWorkerOptions } from "../fixtures";

export const test = base.extend<{}, VrtWorkerOptions>({
  theme: ["light", { option: true, scope: "worker" }],
});

export { expect };
