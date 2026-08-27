import { readFileSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

// MSW Service Worker は VRT 専用 artifact なので本番 dist に混入させない。
// public/ には置かず、dev サーバーの middleware からだけ /mockServiceWorker.js を配信する。
function mswServiceWorkerDevOnly(): Plugin {
  const swPath = fileURLToPath(
    new URL("./test/vrt/msw/mockServiceWorker.js", import.meta.url),
  );
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

export default defineConfig({
  plugins: [
    // VRT (`VITE_USE_MSW`) では devtools の event bus を止める。VRT では使わない上、
    // ServerEventBus.start() は EADDRINUSE 以外の listen エラーで resolve も reject もせず、
    // それを await する configureServer が返らないと vite が listen できなくなるため。
    devtools(process.env.VITE_USE_MSW ? { eventBusConfig: { enabled: false } } : undefined),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    viteReact(),
    mswServiceWorkerDevOnly(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
