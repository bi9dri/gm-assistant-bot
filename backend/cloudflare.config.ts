import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "gm-assistant-bot-api",
    compatibilityDate: "2025-12-12",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "src/index.ts",
    observability: {
      enabled: true,
    },
    domains: ["gm-assistant-bot-api.bidri.dev"],
  },
});
