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

This is a monorepo with separate frontend and backend workspaces.

### Frontend (React SPA)
- **Framework**: React 19
- **Deployment**: Cloudflare Workers Static Assets
- **Entry point**: `frontend/src/main.tsx` - React app with TanStack Router
- **Build**: Vite build + TypeScript compilation
- **UI**: React 19 + DaisyUI + Tailwind CSS v4
- **Routing**: TanStack Router with file-based routing
- **Data Persistence**: Dexie.js (IndexedDB) with Zod validation
- **External Integration**: Discord via Webhooks + Backend API

### Backend (Hono.js API)
- **Framework**: Hono.js
- **Deployment**: Cloudflare Workers
- **Discord Integration**: Discord Bot API (via discord-api-types)
- **Validation**: Zod schemas
- **API Features**:
  - Guild information retrieval
  - Channel management (create, delete)
  - Role management (create, delete, assign)
  - Permission management
  - Health check endpoint

### Database
- **Dexie.js**: TypeScript-friendly wrapper for IndexedDB (frontend-only)
- **Zod**: Schema validation for runtime type safety
- **Storage**: Browser-based IndexedDB
- **Data Models**: Discord profiles, sessions, templates
- **Future**: Import/export functionality planned

### Development Tools
- **Vite** for frontend development and bundling (with HMR)
- **TanStack Router** for file-based routing with type safety
- **Bun** for package management and testing
- **Wrangler** for Cloudflare Workers deployment
- **oxlint/oxfmt** for linting and formatting

## Development Commands

All commands should be run from the repository root:

```bash
# Start frontend development server with Vite HMR (port 3000)
fish -c "bun run dev:frontend"

# Start backend API development server (port 8787)
fish -c "bun run dev:backend"

# Build frontend for production
fish -c "bun run build:frontend"

# Build backend (type-check and format)
fish -c "bun run build:backend"

# Deploy frontend to Cloudflare Workers
fish -c "bun run deploy:frontend"

# Deploy backend API to Cloudflare Workers
fish -c "bun run deploy:backend"

# Lint all code (both frontend and backend)
fish -c "bun run lint"

# Format all code (both frontend and backend)
fish -c "bun run format"

# Type check all code (both frontend and backend)
fish -c "bun run type-check"

# Run tests
fish -c "bun run test"
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

`src/main.tsx`:

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

`src/styles.css`:

```css#styles.css
@import "tailwindcss";

@plugin "daisyui";

@custom-variant dark (&:is(.dark *));
```

### Data Persistence with Dexie.js

Browser-based data storage using IndexedDB with Dexie.js and Zod:

```tsx#example-dexie-setup.tsx
import Dexie, { type EntityTable } from "dexie";
import { z } from "zod";

// Zod schema for validation
export const DiscordProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  webhookUrl: z.string().url(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DiscordProfile = z.infer<typeof DiscordProfileSchema>;

// Dexie database definition
const db = new Dexie("GameMasterAssistant") as Dexie & {
  discordProfiles: EntityTable<DiscordProfile, "id">;
  sessions: EntityTable<Session, "id">;
  templates: EntityTable<Template, "id">;
};

db.version(1).stores({
  discordProfiles: "id, name, createdAt",
  sessions: "id, name, createdAt",
  templates: "id, name, createdAt",
});

export { db };
```

**Usage patterns:**
```tsx
// Create
await db.discordProfiles.add(newProfile);

// Read
const profiles = await db.discordProfiles.toArray();
const profile = await db.discordProfiles.get(id);

// Update
await db.discordProfiles.update(id, { name: "Updated Name" });

// Delete
await db.discordProfiles.delete(id);
```

**Key features:**
- No backend server required - all data stored in browser
- Type-safe with TypeScript and Zod validation
- Supports large datasets via IndexedDB
- Planned: Import/export functionality for data portability

### Discord Integration

**Webhooks (Simple messages):**
```tsx#example-discord-webhook.tsx
// Send message to Discord via Webhook
const sendToDiscord = async (message: string, webhookUrl: string) => {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
};
```

**Bot API (Advanced features via backend):**
```tsx#example-discord-api.tsx
// Call backend API to create a Discord channel
const createChannel = async (guildId: string, channelName: string) => {
  const response = await fetch(`${API_URL}/api/guilds/${guildId}/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: channelName }),
  });
  return response.json();
};
```

**Notes:**
- Webhook URLs are stored in the Dexie.js database (not environment variables)
- Each Discord profile can have its own webhook URL
- Backend API uses Discord Bot Token (stored in Cloudflare Secrets)

### Project Structure

```
/
├── frontend/              # Frontend SPA
│   ├── src/
│   │   ├── main.tsx           # Application entry point
│   │   ├── styles.css         # Global styles with Tailwind + DaisyUI
│   │   ├── routes/            # TanStack Router file-based routes
│   │   │   ├── __root.tsx     # Root layout
│   │   │   ├── index.tsx      # Home page
│   │   │   ├── discordProfile.tsx # Discord Profile management
│   │   │   ├── discordWebhook.tsx # Discord Webhook management
│   │   │   ├── session.tsx    # Session management
│   │   │   └── template.tsx   # Template management
│   │   ├── models/            # Dexie.js models and schemas
│   │   ├── components/        # Shared React components
│   │   ├── api.ts             # Backend API client
│   │   └── theme/             # Theme management
│   ├── public/                # Static assets
│   ├── index.html             # HTML entry point
│   ├── vite.config.ts         # Vite configuration
│   ├── wrangler.toml          # Cloudflare Workers config
│   └── package.json           # Frontend dependencies
├── backend/               # Backend API
│   ├── src/
│   │   ├── index.ts           # Hono application entry point
│   │   ├── env.ts             # Environment variable types
│   │   ├── handler/           # API route handlers
│   │   │   └── healthcheck.ts # Health check endpoint
│   │   └── services/          # Business logic services
│   ├── wrangler.toml          # Cloudflare Workers config
│   └── package.json           # Backend dependencies
├── package.json           # Workspace root
└── tsconfig.json          # Root TypeScript configuration
```

## Backend (Hono.js API)

Backend uses Hono.js for lightweight API routing on Cloudflare Workers with Discord Bot API integration.

### Main Entry Point

`backend/src/index.ts`:

```tsx#index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as healthcheck from "./handler/healthcheck";

const app = new Hono().basePath("/api");

app.use("*", cors());
app.use("*", logger());

const route = app.get("/health", healthcheck.validator, healthcheck.handler);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof route;
```

### Environment Variables

`backend/src/env.ts`:

```tsx#env.ts
export type Env = {
  DISCORD_BOT_TOKEN: string;
};
```

**Setup for local development:**
```bash
cd backend
echo "DISCORD_BOT_TOKEN=your_bot_token_here" > .dev.vars
```

**Setup for production:**
```bash
cd backend
bunx wrangler secret put DISCORD_BOT_TOKEN
# Enter your bot token when prompted
```

### API Handler Example

`backend/src/handler/healthcheck.ts`:

```tsx#healthcheck.ts
import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { z } from "zod";

const schema = z.object({});

export const validator = zValidator("query", schema);

export const handler = (c: Context) => {
  return c.json({ status: "ok" });
};
```

### Discord API Client

Use `discord-api-types` for type-safe Discord API interactions:

```tsx#example-discord-client.tsx
import { REST } from '@discordjs/rest';
import { Routes, type RESTPostAPIChannelResult } from 'discord-api-types/v10';
import type { Env } from '../env';

export class DiscordClient {
  private rest: REST;

  constructor(env: Env) {
    this.rest = new REST({ version: '10' }).setToken(env.DISCORD_BOT_TOKEN);
  }

  async createChannel(guildId: string, name: string): Promise<RESTPostAPIChannelResult> {
    return await this.rest.post(Routes.guildChannels(guildId), {
      body: { name, type: 0 }, // 0 = GUILD_TEXT
    }) as RESTPostAPIChannelResult;
  }
}
```

### Development Commands (Backend)

From repository root:

```bash
# Start backend API development server (port 8787)
fish -c "bun run dev:backend"

# Build backend (type-check and format)
fish -c "bun run build:backend"

# Deploy backend to Cloudflare Workers
fish -c "bun run deploy:backend"
```

From backend directory:

```bash
cd backend

# Lint backend code
fish -c "bun run lint"

# Format backend code
fish -c "bun run format"

# Type check backend code
fish -c "bun run type-check"

# Start local development with hot reload
fish -c "bun run dev"

# Preview with Wrangler
fish -c "bun run preview"

# Deploy to Cloudflare Workers
fish -c "bun run deploy"
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
