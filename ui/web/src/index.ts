import { Hono } from "hono";
import { toSSG } from "hono/ssg";
import { serveStatic } from "hono/bun";
import { renderToString } from "react-dom/server";
import App from "./app";
import { mkdir, readdir, copyFile, rm } from "fs/promises";
import { join } from "path";

const app = new Hono();

// SSG route
app.get("/", (c) => {
  const appHtml = renderToString(<App />);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GM Assistant Bot</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root">${appHtml}</div>
  <script type="module" src="/app.js"></script>
</body>
</html>`;
  return c.html(html);
});

// Static file serving for Cloudflare Workers
app.use("/*", serveStatic({ root: "./dist" }));

// Build function (called via package.json script)
export async function build() {
  console.log("🔨 Building static site...");

  await rm("./dist", { recursive: true, force: true });
  await mkdir("./dist", { recursive: true });

  // Generate static HTML via Hono SSG
  await toSSG(app, { dir: "./dist" });
  console.log("✓ Generated index.html via Hono SSG");

  // Build JavaScript bundle
  await Bun.build({
    entrypoints: ["./src/app.tsx"],
    outdir: "./dist",
    naming: "[name].js",
    minify: true,
    target: "browser",
  });
  console.log("✓ Generated app.js");

  // Build CSS bundle
  await Bun.build({
    entrypoints: ["./src/styles/index.css"],
    outdir: "./dist",
    naming: "styles.css",
    minify: true,
  });
  console.log("✓ Generated styles.css");

  // Copy public assets
  try {
    const publicFiles = await readdir("./public");
    for (const file of publicFiles) {
      await copyFile(join("./public", file), join("./dist", file));
    }
    console.log("✓ Copied public assets");
  } catch {
    console.log("ℹ No public assets to copy");
  }

  console.log("✅ Build complete! Output in ./dist/");
}

// Bun development server (only runs locally)
if (import.meta.main) {
  const server = Bun.serve({
    port: process.env.PORT ?? 3001,
    fetch: app.fetch,
    development: {
      hmr: true,
      console: true,
    },
  });

  console.log(`🚀 Web app running at http://localhost:${server.port}`);
}

// Export for Cloudflare Workers
export default app;
