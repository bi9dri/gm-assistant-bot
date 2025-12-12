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
- **Type Safety**: Zod validation in handlers + AppType export for Hono RPC

### Frontend Structure
- **Dual deployment**: Vite dev server (local with HMR) + Cloudflare Workers Static Assets (production)
- **Entry point**: `ui/web/src/main.tsx` - React app with TanStack Router
- **Build**: Vite build + TypeScript compilation
- **UI**: React 19 + DaisyUI + Tailwind CSS v4
- **Routing**: TanStack Router with file-based routing

### API Layer
- **Hono** for HTTP routing and middleware
- **Hono RPC** (`hono/client`) for type-safe API calls from frontend
- **@hono/zod-validator** for runtime request validation on backend
- Backend exports `AppType` for frontend type inference
- Frontend uses `hc<AppType>()` client with full type safety
- CORS enabled via Hono's `cors()` middleware
- No manual schema imports needed - types flow automatically via RPC

### Database
TBD

### Development Tools
- **Vite** for frontend development and bundling (with HMR)
- **TanStack Router** for file-based routing with type safety
- **Bun** for backend hot reload (`bun --hot`)
- **Wrangler** for Cloudflare Workers preview and deployment

## Development Commands

### Full Stack (from root directory)
```bash
# Start both backend and frontend with hot reload
fish -c "bun run dev"

# Lint all packages
fish -c "bun run lint"

# Format all packages
fish -c "bun run format"

# Type check all packages
fish -c "bun run type-check"

# Deploy all services to Cloudflare Workers
fish -c "bun run deploy"
```

### Backend Only (from backend directory)
```bash
# Start backend with Bun hot reload (port 3000)
fish -c "cd backend && bun run dev"

# Preview with Cloudflare Workers runtime (port 8787)
fish -c "cd backend && bun run preview"

# Deploy to Cloudflare Workers
fish -c "cd backend && bun run deploy"

# Lint backend only
fish -c "cd backend && bun run lint"
```

### Frontend Only (from frontend directory)
```bash
# Start frontend with Vite HMR (port 3000)
fish -c "cd ui/web && bun run dev"

# Build static files
fish -c "cd ui/web && bun run build"

# Preview production build (port 4173)
fish -c "cd ui/web && bun run preview"

# Deploy to Cloudflare Workers (build + deploy)
fish -c "cd ui/web && bun run deploy"

# Lint frontend only
fish -c "cd ui/web && bun run lint"
```

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend (React with TanStack Router + DaisyUI)

Frontend uses Vite for fast development with HMR, TanStack Router for file-based routing, and DaisyUI for UI components.

### Main Entry Point

`ui/web/src/main.tsx`:

```tsx#main.tsx
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
```

### Tailwind CSS v4 + DaisyUI Configuration

`ui/web/src/styles.css`:

```css#styles.css
@import "tailwindcss";

@plugin "daisyui";

@custom-variant dark (&:is(.dark *));
```

### Type-Safe API Client with Hono RPC

`ui/web/src/api.ts`:

```ts#api.ts
import type { AppType } from "../../../backend";
import { hc } from "hono/client";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://gm-assistant-bot-backend.workers.dev";

const client = hc<AppType>(API_BASE_URL);
export default client.api;
```

Usage in components:

```tsx#example-usage.tsx
import api from "../api";

// Fully type-safe API calls - no manual type imports needed!
const response = await api.health.$get();
const data = await response.json();
// `data` is automatically typed based on backend route definition
```

### Backend API with Hono

`backend/src/index.ts`:

```ts#index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as healthcheck from "./handler/healthcheck";

const app = new Hono().basePath("/api");
const route = app.get("/health", healthcheck.validator, healthcheck.handler);

app.use("*", cors());
app.use("*", logger());

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof route; // For frontend RPC client
```

### Handler with Validation

`backend/src/handler/healthcheck.ts`:

```ts#healthcheck.ts
import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";

export const validator = zValidator("query", z.object({}));

export const handler = (c: Context) => {
  return c.json({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
};
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
