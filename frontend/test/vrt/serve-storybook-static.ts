// 静的ビルドした Storybook (`storybook-static/`) を Bun.serve で配信する小さな
// CLI。新規 npm dep を増やさず supply chain ルール (≥7 day cooldown) を回避する。
// Playwright config の webServer から起動される。

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 6007);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../storybook-static");

if (!existsSync(root)) {
  console.error(`storybook-static not found at ${root}. Run \`bun run build-storybook\` first.`);
  process.exit(1);
}

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(root, requestedPath);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    // SPA fallback: Storybook の iframe view 等は index.html 経由で配信される。
    const fallback = Bun.file(join(root, "index.html"));
    if (await fallback.exists()) {
      return new Response(fallback);
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Storybook static server: ${server.url}`);
