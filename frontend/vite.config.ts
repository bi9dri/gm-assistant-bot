import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { URL, fileURLToPath } from "node:url";

// VRT 中は @tanstack/devtools-vite を無効化する: console を /__tsd/console-pipe に POST する dev tool で、
// VITE_MSW_STRICT=true との組み合わせで unhandled request error を量産するため
const isVrtRun = process.env.VITE_MSW_ENABLED === "true";

export default defineConfig({
  plugins: [
    ...(isVrtRun ? [] : [devtools()]),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    viteReact(),
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
