import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { URL, fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { type Plugin, defineConfig, lazyPlugins } from "vite-plus";

function mswServiceWorkerDevOnly(): Plugin {
  const swPath = createRequire(import.meta.url).resolve("msw/mockServiceWorker.js");
  return {
    name: "msw-service-worker-dev-only",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/mockServiceWorker.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Service-Worker-Allowed", "/");
        res.end(readFileSync(swPath));
      });
    },
  };
}

const isVitest = process.env.VITEST === "true";
const isStorybook = process.env.STORYBOOK === "true";
const skipStartPlugins = isVitest || isStorybook;

export default defineConfig({
  plugins: lazyPlugins(() => [
    process.env.VITE_USE_MSW === "true" ? undefined : devtools(),
    tailwindcss(),
    ...(skipStartPlugins
      ? []
      : [cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart()]),
    viteReact({ compiler: true }),
    mswServiceWorkerDevOnly(),
  ]),
  optimizeDeps: {
    include: ["fake-indexeddb"],
  },
  environments: {
    ssr: {
      optimizeDeps: {
        include: ["fake-indexeddb"],
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
  server: {
    hmr: process.env.VITE_USE_MSW === "true" ? false : undefined,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/unit.setup.ts"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
    coverage: {
      enabled: true,
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/routeTree.gen.ts",

        "src/components/Node/index.ts",
        "src/components/Node/base/index.ts",
        "src/components/Node/utils/index.ts",
        "src/db/index.ts",

        "src/components/Node/nodes/**",
        "src/components/Node/base/base-node.tsx",
        "src/components/Node/base/node-wrapper.tsx",
        "src/components/Node/base/editable-title.tsx",
        "src/components/Node/utils/DynamicValueInput.tsx",
        "src/components/Node/utils/FlagValueSelector.tsx",
        "src/components/Node/utils/PortaledSelect.tsx",
        "src/components/Node/utils/ResourceSelector.tsx",
        "src/toast/**",
        "src/theme/**",
        "src/hooks/**",

        "src/db/models/Category.ts",
        "src/db/models/Channel.ts",
        "src/db/models/DiscordBot.ts",
        "src/db/models/Guild.ts",
        "src/db/models/Role.ts",

        "src/db/database.ts",

        "src/components/Node/contexts/**",
        "src/components/Node/utils/useTemplateResources.ts",

        "src/api.ts",

        "src/fileSystem.ts",

        "src/components/Node/utils/messageSchema.ts",

        "src/flow/components/**",
        "src/flow/engine/fakeContext.ts",
        "src/flow/engine/gateway.ts",
        "src/flow/engine/resourceStore.ts",
        "src/flow/engine/types.ts",
        "src/flow/registry/*.tsx",
        "src/flow/registry/category.ts",
        "src/flow/runner/types.ts",
        "src/flow/runner/useSessionRunner.ts",
        "src/scenario/components/**",
        "src/scenario/editor/**",
        "src/scenario/scrollTo.ts",

        "test/**",
      ],
    },
  },
});
