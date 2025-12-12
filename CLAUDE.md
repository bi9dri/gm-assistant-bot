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
- **Single entry point**: `backend/src/index.ts` - Hono app for both Bun and Cloudflare Workers
- **API Framework**: Hono with middleware (CORS, logger)
- **Type Safety**: Shared Zod schemas in `backend/src/types/api.ts`

### Frontend Structure
- **Dual deployment**: Bun (local with HMR) + Cloudflare Workers Static Assets (production)
- **Single entry point**: `ui/web/src/index.ts` - Hono app with SSG + Bun dev server
- **Build**: SSG via Hono's `toSSG()` helper + Bun.build() for assets
- **UI**: React 19 + HeroUI + Tailwind CSS v4

### API Layer
- **Hono** for HTTP routing and middleware
- **Zod** for runtime type validation
- Backend defines schemas in `backend/src/types/api.ts`
- Frontend imports schemas for validation in `ui/web/src/lib/api-client.ts`
- CORS enabled via Hono's `cors()` middleware
- Type safety via shared Zod schemas + TypeScript project references

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

### Development Server + SSG

`ui/web/src/index.ts`:

```ts#index.ts
import { Hono } from "hono";
import { toSSG } from "hono/ssg";
import { renderToString } from "react-dom/server";
import App from "./app";

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

// Build function (called via package.json script)
export async function build() {
  await toSSG(app, { dir: "./dist" });
  // Then build JS/CSS with Bun.build()...
}

// Bun development server (only runs locally)
if (import.meta.main) {
  const server = Bun.serve({
    port: process.env.PORT ?? 3001,
    fetch: app.fetch,
    development: { hmr: true, console: true },
  });
  console.log(`🚀 Web app running at http://localhost:${server.port}`);
}

export default app;
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

### Type-Safe API Client (Fetch + Zod)

`ui/web/src/lib/api-client.ts`:

```ts#api-client.ts
import { HealthResponseSchema, type HealthResponse } from "../../../backend/src/types/api";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gm-assistant-bot-backend.workers.dev";

export const api = {
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return HealthResponseSchema.parse(data); // Runtime validation
  },
} as const;
```

### Backend API with Hono

`backend/src/index.ts`:

```ts#index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HealthResponseSchema } from "./types/api";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/api/health", (c) => {
  const response = {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  };
  HealthResponseSchema.parse(response); // Validate
  return c.json(response);
});

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
```

### Shared Type Definitions

`backend/src/types/api.ts`:

```ts#types/api.ts
import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
