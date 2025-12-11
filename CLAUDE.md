# Project Instructions for AI Assistant

## General Guidelines

### Shell Commands
- **Always use fish shell** for all commands: `fish -c "command"`

### Runtime and Package Manager
- Default to using **Bun** instead of Node.js
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv

### Dependency Management
- **Use fixed versions only** (no `^` or `~` prefixes)
- This is a security measure against supply chain attacks
- When updating dependencies, always specify exact versions

## Project Architecture

### Backend Structure
- **Dual deployment**: Bun (local) + Cloudflare Workers (production)
- **Entry points**:
  - `backend/src/index.ts` - Bun development server
  - `backend/src/worker.ts` - Cloudflare Workers handler
- **Shared logic**: `backend/src/app.ts` contains runtime-agnostic code with CORS
- **API Router**: `backend/src/orpc/router.ts` - oRPC contract and implementation

### Frontend Structure
- **Dual deployment**: Bun (local with HMR) + Cloudflare Workers Static Assets (production)
- **Entry points**:
  - `ui/web/src/index.ts` - Bun development server (port 3001)
  - `ui/web/src/worker.ts` - Cloudflare Workers static asset handler
- **Build**: `ui/web/src/build.ts` - SSG build script
- **UI**: React 19 + HeroUI + Tailwind CSS v4

### API Layer
- **oRPC** for type-safe API communication
- Backend exports contract via `backend/src/orpc/router.ts`
- Frontend imports contract for type-safe client in `ui/web/src/lib/orpc-client.ts`
- CORS enabled via `CORSPlugin` in backend

### Database
TBD

### Bun APIs (Local Development Only)
- HTML imports for React SSG (used in `ui/web/src/index.ts`)
- `Bun.build()` for bundling JS/CSS (used in `ui/web/src/build.ts`)
- `Bun.serve()` with HMR for development

## Development Commands

```bash
# Full stack development (backend + frontend)
fish -c "bun run dev"

# Backend only (Bun with hot reload, port 3000)
fish -c "bun run backend:dev"

# Frontend only (Bun with HMR, port 3001)
fish -c "bun run web:dev"

# Build frontend static files
fish -c "bun run web:build"

# Preview with Workers runtime
fish -c "bun run backend:preview"  # Backend
fish -c "bun run web:preview"      # Frontend

# Linting
fish -c "bun run lint"
fish -c "bun run lint:fix"

# Type checking
fish -c "bun run type-check"

# Deploy to Cloudflare Workers
fish -c "bun run backend:deploy"   # Backend
fish -c "bun run web:deploy"       # Frontend
```

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend (React SSG with HeroUI)

Use HTML imports with `Bun.serve()` for development. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

### Development Server

`ui/web/src/index.ts`:

```ts#index.ts
import indexHtml from "./index.html"

const server = Bun.serve({
  port: process.env.PORT ?? 3001,
  routes: {
    "/": indexHtml,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Web app running at http://localhost:${server.port}`);
```

### HTML Entry Point

`ui/web/src/index.html`:

```html#index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GM Assistant Bot</title>
  <link rel="stylesheet" href="./styles/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./app.tsx"></script>
</body>
</html>
```

### React App with HeroUI

`ui/web/src/app.tsx`:

```tsx#app.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { Home } from "./pages/Home";
import "./styles/index.css";

export default function App() {
  return (
    <HeroUIProvider>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Home />
      </main>
    </HeroUIProvider>
  );
}

// Client-side hydration
if (typeof document !== "undefined") {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}
```

### Tailwind CSS v4 Configuration

`ui/web/src/styles/index.css`:

```css#index.css
@import "tailwindcss";
@plugin './hero.ts';
@source '../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
@custom-variant dark (&:is(.dark *));
```

`ui/web/src/hero.ts`:

```ts#hero.ts
import { heroui } from "@heroui/react";

export default heroui();
```

### Type-Safe API Client (oRPC)

`ui/web/src/lib/orpc-client.ts`:

```ts#orpc-client.ts
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import type { contract } from '../../../backend/src/orpc/router';

const link = new RPCLink({
  url: typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000/rpc'
    : 'https://gm-assistant-bot-backend.workers.dev/rpc',
});

export const api: ContractRouterClient<typeof contract> = createORPCClient(link);
```

### SSG Build Script

`ui/web/src/build.ts`:

```ts#build.ts
import { renderToStaticMarkup } from "react-dom/server";
import App from "./app";
import { mkdir, write, rm } from "fs/promises";

async function build() {
  console.log("🔨 Building static site...");

  // Clean and create dist directory
  await rm("./dist", { recursive: true, force: true });
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

  // Build JavaScript bundle
  await Bun.build({
    entrypoints: ["./src/app.tsx"],
    outdir: "./dist",
    naming: "[name].js",
    minify: true,
    target: "browser",
  });

  // Build CSS bundle
  await Bun.build({
    entrypoints: ["./src/styles/index.css"],
    outdir: "./dist",
    naming: "styles.css",
    minify: true,
  });

  console.log("✅ Build complete! Output in ./dist/");
}

build().catch(console.error);
```

### Cloudflare Workers Static Asset Handler

`ui/web/src/worker.ts`:

```ts#worker.ts
/// <reference types="@cloudflare/workers-types" />

export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<{ ASSETS: Fetcher }>;
```

`ui/web/wrangler.toml`:

```toml
name = "gm-assistant-bot-web"
main = "src/worker.ts"
compatibility_date = "2025-12-11"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
html_handling = "auto-trailing-slash"

[observability]
enabled = true
```

Then, run development server:

```sh
bun --hot ./ui/web/src/index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
