// 静的ビルドした Storybook (`storybook-static/`) を Node の標準 http で配信する
// 小さな CLI。新規 npm dep を増やさず supply chain ルール (≥7 day cooldown) を
// 回避する。Playwright config の webServer から起動される。

import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 6007);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../storybook-static");

if (!existsSync(root)) {
  console.error(`storybook-static not found at ${root}. Run \`pnpm build-storybook\` first.`);
  process.exit(1);
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  // パストラバーサル防止: root 配下に正規化して閉じ込める。
  const filePath = normalize(join(root, requestedPath));
  const fallback = join(root, "index.html");
  const target = existsSync(filePath) ? filePath : fallback;

  res.setHeader("Content-Type", CONTENT_TYPES[extname(target)] ?? "application/octet-stream");
  createReadStream(target).pipe(res);
});

server.listen(port, () => {
  console.log(`Storybook static server: http://localhost:${port}`);
});
