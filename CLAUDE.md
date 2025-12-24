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

## Design Documentation

プロジェクトの詳細な設計ドキュメントは `/docs` ディレクトリに保存されています：

- [ノードベースワークフローシステム設計書](docs/node-workflow-system.md) - TRPG/マーダーミステリーセッション管理のための、ノードベースワークフローシステムの設計

## Project Architecture

This is a monorepo with separate frontend and backend workspaces.

### Frontend (React SPA)
- **Framework**: React
- **Deployment**: Cloudflare Workers Static Assets
- **Entry point**: `frontend/src/main.tsx` - React app with TanStack Router
- **Build**: Vite build + TypeScript compilation
- **UI**: React + DaisyUI + Tailwind CSS
- **Routing**: TanStack Router with file-based routing
- **Data Persistence**: Dexie.js (IndexedDB) with Zod validation
- **External Integration**: Discord via Backend API

### Backend (Hono.js API)
- **Framework**: Hono.js
- **Deployment**: Cloudflare Workers
- **Discord Integration**: discord.js (Discord Bot API client)
- **Validation**: Zod schemas with @hono/zod-validator
- **API Features**:
  - Guild list retrieval
  - Category creation
  - Channel creation
  - Role creation and deletion
  - Channel deletion
  - Health check endpoint

### Database
- **Dexie.js**: TypeScript-friendly wrapper for IndexedDB (frontend-only)
- **Zod**: Schema validation for runtime type safety
- **Storage**: Browser-based IndexedDB
- **Data Models**:
  - Game Sessions: Session information with guild, category, and channel IDs
  - Templates: Reusable role and channel configurations
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

`frontend/src/db.ts`:
```tsx#db.ts
import Dexie, { type EntityTable } from "dexie";
import type { GameSession } from "./models/gameSession";
import type { Template } from "./models/template";

export const db = new Dexie("GmAssistant") as Dexie & {
  gameSessions: EntityTable<GameSession, "id">;
  templates: EntityTable<Template, "id">;
};

// Database schema definition
db.version(2).stores({
  gameSessions: "++id, name, createdAt",
  templates: "++id, name, *roles, *channels, createdAt, updatedAt",
});
```

`frontend/src/models/template.ts` (example model with Zod validation):
```tsx#template.ts
import { db } from "@/db";
import z from "zod";

const schema = z.object({
  id: z.number(),
  name: z.string().min(1).trim(),
  roles: z.array(z.string().min(1).trim()),
  channels: z.array(z.object({
    name: z.string().min(1).max(50).trim(),
    type: z.enum(["text", "voice"]),
    writerRoles: z.array(z.string().min(1).trim()),
    readerRoles: z.array(z.string().min(1).trim()),
  })),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export class Template {
  // ... constructor and properties

  static async create(name: string, roles: string[], channels: {...}[]) {
    schema.pick({ name: true }).parse({ name });
    const now = new Date();
    const id = await db.templates.add({ name, roles, channels, createdAt: now });
    return new Template(id, name, roles, channels, now);
  }

  async update() {
    schema.parse(this);
    this.updatedAt = new Date();
    await db.templates.put(this, this.id);
  }

  static async delete(id: number) {
    await db.templates.delete(id);
  }

  static async getAll() {
    return db.templates.toArray();
  }

  static async getById(id: number) {
    return db.templates.get(id);
  }
}
```

**Usage patterns:**
```tsx
// Create
const template = await Template.create("My Template", ["Role1", "Role2"], [...]);

// Read all
const templates = await Template.getAll();

// Read by ID
const template = await Template.getById(1);

// Update
template.name = "Updated Name";
await template.update();

// Delete
await Template.delete(1);
```

**Key features:**
- No backend server required - all data stored in browser
- Type-safe with TypeScript and Zod validation
- Supports large datasets via IndexedDB
- Planned: Import/export functionality for data portability

### Discord Integration

The app integrates with Discord via the Backend API, which uses discord.js to interact with the Discord Bot API.

**Frontend API Client** (`frontend/src/api.ts`):
```tsx#api.ts
// Example: List available guilds
const guilds = await fetch(`${API_URL}/api/guilds`).then(r => r.json());

// Example: Create a category in a guild
const category = await fetch(`${API_URL}/api/guilds/${guildId}/categories`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Session Name" }),
}).then(r => r.json());

// Example: Create a channel in a category
const channel = await fetch(`${API_URL}/api/guilds/${guildId}/channels`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "channel-name",
    type: "text", // or "voice"
    parentCategoryId: categoryId,
    writerRoleIds: ["role1", "role2"],
    readerRoleIds: ["role3"],
  }),
}).then(r => r.json());

// Example: Create a role in a guild
const role = await fetch(`${API_URL}/api/guilds/${guildId}/roles`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Player" }),
}).then(r => r.json());
```

**Backend Discord Client** (`backend/src/discord.ts`):
```tsx#discord.ts
import { REST } from "discord.js";
import { Routes, ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);

// Get guilds the bot has access to
export const getGuilds = async () => {
  const guilds = await rest.get(Routes.userGuilds());
  return guilds.map(g => ({ id: g.id, name: g.name, icon: `...` }));
};

// Create a category with locked permissions
export const createCategory = async (guildId: string, name: string) => {
  const category = await rest.post(Routes.guildChannels(guildId), {
    body: {
      type: ChannelType.GuildCategory,
      name,
      permission_overwrites: [
        { id: guildId, type: OverwriteType.Role, deny: channelPermissions.toString() }
      ],
    },
  });
  return { id: category.id, name: category.name };
};

// Create a channel with role-based permissions
export const createChannel = async (
  guildId: string, parentCategoryId: string, name: string,
  type: "text" | "voice", writerRoleIds: string[], readerRoleIds: string[]
) => {
  const channel = await rest.post(Routes.guildChannels(guildId), {
    body: {
      type: type === "text" ? ChannelType.GuildText : ChannelType.GuildVoice,
      name, parent_id: parentCategoryId,
      permission_overwrites: [
        ...writerRoleIds.map(r => ({ id: r, type: OverwriteType.Role, allow: writerPermission.toString() })),
        ...readerRoleIds.map(r => ({ id: r, type: OverwriteType.Role, allow: readerPermission.toString() })),
      ],
    },
  });
  return { id: channel.id, name: channel.name };
};

// Create a mentionable role
export const createRole = async (guildId: string, name: string) => {
  const role = await rest.post(Routes.guildRoles(guildId), {
    body: { name, mentionable: true },
  });
  return { id: role.id, name: role.name };
};
```

**Notes:**
- Backend API uses Discord Bot Token (stored in Cloudflare Secrets via `wrangler secret put DISCORD_BOT_TOKEN`)
- Frontend calls backend API endpoints to interact with Discord
- Backend uses `discord.js` REST client with `discord-api-types` for type safety
- Permissions are carefully configured for role-based channel access (writers, readers)

### Project Structure

```
/
├── frontend/              # Frontend SPA
│   ├── src/
│   │   ├── main.tsx           # Application entry point
│   │   ├── styles.css         # Global styles with Tailwind CSS v4 + DaisyUI
│   │   ├── routes/            # TanStack Router file-based routes
│   │   │   ├── __root.tsx     # Root layout
│   │   │   ├── index.tsx      # Home page
│   │   │   ├── session.tsx    # Session management page
│   │   │   └── template.tsx   # Template management page
│   │   ├── models/            # Dexie.js models and Zod schemas
│   │   │   ├── gameSession.ts # Game session model
│   │   │   └── template.ts    # Template model
│   │   ├── components/        # Shared React components
│   │   │   └── CreateSession.tsx # Session creation form
│   │   ├── theme/             # Theme management
│   │   │   ├── ThemeProvider.tsx  # Theme context provider
│   │   │   ├── ThemeSwichMenu.tsx # Theme switcher menu
│   │   │   └── ThemeIcon.tsx      # Theme icon component
│   │   ├── toast/             # Toast notifications
│   │   │   └── ToastProvider.tsx  # Toast context provider
│   │   ├── db.ts              # Dexie.js database setup
│   │   └── api.ts             # Backend API client
│   ├── public/                # Static assets
│   ├── index.html             # HTML entry point
│   ├── vite.config.ts         # Vite configuration
│   ├── wrangler.toml          # Cloudflare Workers config
│   └── package.json           # Frontend dependencies
├── backend/               # Backend API
│   ├── src/
│   │   ├── index.ts           # Hono application entry point with all route handlers
│   │   ├── discord.ts         # Discord.js client wrapper
│   │   ├── schemas.ts         # Zod validation schemas
│   │   └── env.ts             # Environment variable types
│   ├── wrangler.toml          # Cloudflare Workers config
│   ├── .dev.vars              # Local env vars (gitignored)
│   └── package.json           # Backend dependencies
├── package.json           # Workspace root
└── tsconfig.json          # Root TypeScript configuration
```

## Backend (Hono.js API)

Backend uses Hono.js for lightweight API routing on Cloudflare Workers with Discord Bot API integration.

### Main Entry Point

`backend/src/index.ts`:

```tsx#index.ts
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import {
  createCategory,
  createChannel,
  createRole,
  deleteChannel,
  deleteRole,
  getGuilds,
} from "./discord";
import {
  createCategorySchema,
  createChannelSchema,
  createRoleSchema,
  deleteChannelSchema,
  deleteRoleSchema,
} from "./schemas";

const app = new Hono()
  .basePath("/api")
  .use("*", cors())
  .use("*", logger())
  .get("/health", (c) => c.json({ status: "ok" as const }))
  .get("/guilds", async (c) => {
    return c.json({ guilds: await getGuilds() });
  })
  .post("/roles", zValidator("json", createRoleSchema), async (c) => {
    const role = await createRole(c.req.valid("json"));
    return c.json({ role });
  })
  .delete("/roles", zValidator("json", deleteRoleSchema), async (c) => {
    await deleteRole(c.req.valid("json"));
    return new Response(undefined, { status: 201 });
  })
  .post("/categories", zValidator("json", createCategorySchema), async (c) => {
    const category = await createCategory(c.req.valid("json"));
    return c.json({ category });
  })
  .post("/channels", zValidator("json", createChannelSchema), async (c) => {
    const channel = await createChannel(c.req.valid("json"));
    return c.json({ channel });
  })
  .delete("/channels", zValidator("json", deleteChannelSchema), async (c) => {
    await deleteChannel(c.req.valid("json"));
    return new Response(undefined, { status: 204 });
  })
  .notFound((c) => c.json({ error: "Not Found" }, 404))
  .onError((err, c) => {
    console.error("Server error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

export default app;
export type AppType = typeof app;
```

**Available API Endpoints:**
- `GET /api/health` - Health check
- `GET /api/guilds` - List all guilds
- `POST /api/categories` - Create a category
- `POST /api/roles` - Create a role
- `DELETE /api/roles` - Delete a role
- `POST /api/channels` - Create a channel
- `DELETE /api/channels` - Delete a channel

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
cp .dev.vars .env
```

**Setup for production:**
```bash
cd backend
bunx wrangler secret put DISCORD_BOT_TOKEN
# Enter your bot token when prompted
```

### Validation Schemas

`backend/src/schemas.ts`:
```tsx#schemas.ts
import z from "zod";

export const createRoleSchema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const deleteRoleSchema = z.object({
  guildId: z.string().min(1),
  roleId: z.string().min(1),
});

export const createCategorySchema = z.object({
  guildId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const createChannelSchema = z.object({
  guildId: z.string().min(1),
  parentCategoryId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string()),
  readerRoleIds: z.array(z.string()),
});

export const deleteChannelSchema = z.object({
  guildId: z.string().min(1),
  channelId: z.string().min(1),
});

export type CreateRoleData = z.infer<typeof createRoleSchema>;
export type DeleteRoleData = z.infer<typeof deleteRoleSchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type CreateChannelData = z.infer<typeof createChannelSchema>;
export type DeleteChannelData = z.infer<typeof deleteChannelSchema>;
```

### Discord API Client

The backend uses `discord.js` REST client with `discord-api-types` for type-safe Discord API interactions.

See `backend/src/discord.ts` for the full implementation. Key functions include:

- `getGuilds()`: List all guilds the bot has access to
- `getCategory(guildId, categoryId)`: Get category and its channels
- `createCategory(guildId, name)`: Create a category with locked @everyone permissions
- `createChannel(guildId, parentCategoryId, name, type, writerRoleIds, readerRoleIds)`: Create a text/voice channel with role-based permissions
- `createRole(guildId, name)`: Create a mentionable role
- `deleteChannel(channelId)`: Delete a channel
- `deleteRole(guildId, roleId)`: Delete a role
- `changeChannelPermissions(channelId, writerRoleIds, readerRoleIds)`: Update channel permissions

**Permission Configuration:**
- **Writer roles**: Can read, write messages, manage threads, send voice, etc.
- **Reader roles**: Can view, read history, connect to voice, speak, but cannot write
- **@everyone role**: Denied all permissions in categories (privacy by default)

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
