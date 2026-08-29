import type { StorybookConfig } from "@storybook/react-vite";

// @storybook/react-vite の builder は vite.config.ts を自動で読み込む。
// alias と Tailwind plugin を viteFinal で再注入しないのはこのため — 重複すると二重に適用される。
// 同時に、vite.config.ts に plugin を足すと Storybook build と VRT baseline にも波及する。
const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../test/stories/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-themes", "@storybook/addon-docs"],
  // reactDocgen: "react-docgen-typescript" は @joshwooding/vite-plugin-react-docgen-typescript@0.7.0 が
  // typescript の CJS export から直接 `ts.sys` を参照するが、TypeScript 7.0.2 (tsgo 系) はこの経路で
  // classic Compiler API を公開しなくなり `ts.sys` が undefined になってクラッシュする。
  // react-docgen は Babel ベースで TypeScript Compiler API に触れないため回避できる。
  typescript: { check: false, reactDocgen: "react-docgen" },
};

export default config;
