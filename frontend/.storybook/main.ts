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
  typescript: { check: false, reactDocgen: "react-docgen-typescript" },
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
