import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

// 本プロジェクトの Storybook は VRT 用途のみで、production code (src/) と分離。
// vite.config.ts は spread しない: tanstackRouter / MSW middleware / devtools が Storybook で起動して破綻するため、
// 必要な alias と Tailwind v4 plugin だけ viteFinal で再注入する。
const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../test/stories/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-themes", "@storybook/addon-docs"],
  // reactDocgen: "react-docgen-typescript" は @joshwooding/vite-plugin-react-docgen-typescript@0.7.0 が
  // typescript の CJS export から直接 `ts.sys` を参照するが、TypeScript 7.0.2 (tsgo 系) はこの経路で
  // classic Compiler API を公開しなくなり `ts.sys` が undefined になってクラッシュする。
  // react-docgen は Babel ベースで TypeScript Compiler API に触れないため回避できる。
  typescript: { check: false, reactDocgen: "react-docgen" },
  async viteFinal(cfg) {
    return mergeConfig(cfg, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "@": fileURLToPath(new URL("../src", import.meta.url)),
        },
      },
    });
  },
};

export default config;
