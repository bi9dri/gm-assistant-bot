import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../test/stories/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-themes", "@storybook/addon-docs"],
  typescript: { check: false, reactDocgen: "react-docgen" },
};

export default config;
