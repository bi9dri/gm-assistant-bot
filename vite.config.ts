import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    // ignorePatterns are rooted at this config file's directory (oxfmt >=0.59),
    // so paths must be repo-root-relative, not per-workspace-relative.
    ignorePatterns: ["frontend/src/routeTree.gen.ts"],
    // Enable import sorting with default settings
    experimentalSortImports: {},
  },
});
