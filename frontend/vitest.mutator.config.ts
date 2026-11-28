import { URL, fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const frontendDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: frontendDir,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
  test: {
    root: frontendDir,
    env: {
      NODE_ENV: "test",
    },
    include: [
      "src/components/Node/utils/DynamicValue.test.ts",
      "src/components/Node/utils/evaluateCondition.test.ts",
      "src/flow/engine/branch.test.ts",
      "src/flow/engine/execute.test.ts",
      "src/flow/engine/order.test.ts",
      "src/scenario/document.test.ts",
      "src/scenario/outline.test.ts",
      "src/scenario/textTransfer.test.ts",
    ],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
});
