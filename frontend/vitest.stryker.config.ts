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
    include: ["src/**/*.test.ts"],
    setupFiles: [fileURLToPath(new URL("./test/unit.setup.ts", import.meta.url))],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
});
