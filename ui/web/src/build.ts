import { renderToStaticMarkup } from "react-dom/server";
import App from "./app";
import { mkdir, write, readdir, copyFile, rm } from "fs/promises";
import { join } from "path";

async function build() {
  console.log("🔨 Building static site...");

  // Clean and create dist directory
  try {
    await rm("./dist", { recursive: true, force: true });
  } catch {
    // Directory doesn't exist yet
  }
  await mkdir("./dist", { recursive: true });

  // Render React to static HTML
  const appHtml = renderToStaticMarkup(<App />);

  // Create full HTML document
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

  // Write HTML
  await write("./dist/index.html", html);
  console.log("✓ Generated index.html");

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
      await copyFile(
        join("./public", file),
        join("./dist", file)
      );
    }
    console.log("✓ Copied public assets");
  } catch {
    // No public directory or files yet
    console.log("ℹ No public assets to copy");
  }

  console.log("✅ Build complete! Output in ./dist/");
}

build().catch(console.error);
