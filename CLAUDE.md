# Project Instructions for AI Assistant

## Language

- **ユーザとの対話は日本語で行う** - All interactions with users should be in Japanese
- コード内のコメントやドキュメントは英語でも可
- エラーメッセージや技術的な説明は必要に応じて英語を含めても良い

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

### ユーザー向けドキュメント (`/docs`)
- [ノードベースワークフローシステム設計書](docs/node-workflow-system.md) - TRPG/マーダーミステリーセッション管理のための、ノードベースワークフローシステムの設計

### 開発者向けドキュメント (`/docs/dev`)
- [ノードシステムアーキテクチャ](docs/dev/node-system-architecture.md) - **新しいノードを実装する際は必ず参照**。ノードの基本構造、実装パターン、チェックリストを含む
- [RecordCombinationNode設計書](docs/dev/record-combination-node.md) - 組み合わせ記録ノードの設計（Issue #23）

## Project Architecture

This is a single-page application (SPA) project with client-side Discord integration.

### Application (React SPA)
- **Framework**: React
- **Deployment**: Cloudflare Workers Static Assets
- **Entry point**: `src/main.tsx` - React app with TanStack Router
- **Build**: Vite build + TypeScript compilation
- **UI**: React + DaisyUI + Tailwind CSS v4
- **Routing**: TanStack Router with file-based routing
- **Data Persistence**: Dexie.js (IndexedDB) with Zod validation
- **Discord Integration**: Direct client-side Discord API integration using Bot Token

### Discord Integration
- **Client**: Custom ApiClient class (`src/discord.ts`)
- **Authentication**: Discord Bot Token stored in IndexedDB
- **API**: Direct REST API calls to Discord API v10
- **Features**:
  - Bot profile retrieval
  - Guild list retrieval
  - Category creation
  - Channel creation and deletion
  - Role creation and deletion
  - Channel permission management
- **Validation**: Zod schemas for type safety
- **Security**: Bot Token stored locally in browser (IndexedDB)

### Database (Client-side)
- **Dexie.js**: TypeScript-friendly wrapper for IndexedDB
- **Zod**: Schema validation for runtime type safety
- **Storage**: Browser-based IndexedDB only
- **Data Models**:
  - DiscordBot: Bot token and profile information
  - GameSession: Session information with guild and workflow
  - SessionNode: Workflow nodes for session management
  - Guild: Discord guild information
  - Category: Discord category information
  - Channel: Discord channel information with permissions
  - Role: Discord role information
  - Template: Reusable workflow templates
  - TemplateNode: Template workflow nodes

### Development Tools
- **Vite** for development and bundling (with HMR)
- **TanStack Router** for file-based routing with type safety
- **Bun** for package management and testing
- **Wrangler** for Cloudflare Workers deployment
- **oxlint/oxfmt** for linting and formatting
- **Vitest** for testing

## Development Commands

All commands should be run from the repository root:

```bash
# Start development server with Vite HMR (port 3000)
fish -c "bun run dev"

# Build for production
fish -c "bun run build"

# Preview production build locally
fish -c "bun run preview"

# Deploy to Cloudflare Workers
fish -c "bun run deploy"

# Lint all code
fish -c "bun run lint"

# Format all code
fish -c "bun run format"

# Type check all code
fish -c "bun run type-check"

# Run tests
fish -c "bun run test"
```

## Development Workflow

**重要**: コードを実装した後は、必ず以下のコマンドを順番に実行してエラーがないことを確認する：

1. `fish -c "bun run type-check"` - 型エラーがないことを確認
2. `fish -c "bun run format"` - コードをフォーマット
3. `fish -c "bun run lint"` - lint エラーがないことを確認

すべてのコマンドが成功するまで、実装は完了とみなさない。

## Testing

Use `vitest` to run tests.

```ts#example.test.ts
import { test, expect } from "vitest";

test("example test", () => {
  expect(1).toBe(1);
});
```

## Application Structure (React with TanStack Router + DaisyUI)

The application uses Vite for fast development with HMR, TanStack Router for file-based routing, and DaisyUI for UI components.

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

`src/db.ts`:
```tsx#db.ts
import Dexie, { type EntityTable, type Table } from "dexie";
import z from "zod";
import * as models from "@/models";

export class DB extends Dexie {
  DiscordBot!: Table<z.infer<typeof models.DiscordBotSchema>, string>;
  GameSession!: EntityTable<z.infer<typeof models.GameSessionSchema>, "id">;
  SessionNode!: EntityTable<z.infer<typeof models.SessionNodeSchema>, "id">;
  Guild!: Table<z.infer<typeof models.GuildSchema>, string>;
  Category!: Table<z.infer<typeof models.CategorySchema>, string>;
  Channel!: Table<z.infer<typeof models.ChannelSchema>, string>;
  Role!: Table<z.infer<typeof models.RoleSchema>, string>;
  Template!: EntityTable<models.Template, "id">;
  TemplateNode!: EntityTable<models.TemplateNode, "id">;

  constructor() {
    super("GmAssistant");
    this.version(1).stores({
      DiscordBot: "id, name, token, icon",
      GameSession: "++id, name, guildId, createdAt",
      SessionNode: "++id, sessionId, description, executedAt",
      Guild: "id, name, icon",
      Category: "id, sessionId, name",
      Channel: "id, sessionId, name, type, *writerRoleIds, *readerRoleIds",
      Role: "[id+guildId], name",
      Template: "++id, name, createdAt, updatedAt",
      TemplateNode: "++id, templateId, description",
    });
  }
}

export const db = new DB();
```

**Model example** (`src/models/Template.ts`):
```tsx#Template.ts
import { db } from "@/db";
import z from "zod";

const schema = z.object({
  id: z.number(),
  name: z.string().min(1).trim(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export class Template {
  constructor(
    public id: number,
    public name: string,
    public createdAt: Date,
    public updatedAt?: Date,
  ) {}

  static async create(name: string) {
    schema.pick({ name: true }).parse({ name });
    const now = new Date();
    const id = await db.Template.add({ name, createdAt: now });
    return new Template(id, name, now);
  }

  async update() {
    this.updatedAt = new Date();
    await db.Template.put(this);
  }

  static async delete(id: number) {
    await db.Template.delete(id);
  }

  static async getAll() {
    return db.Template.toArray();
  }

  static async getById(id: number) {
    return db.Template.get(id);
  }
}
```

**Key features:**
- No backend server required - all data stored in browser
- Type-safe with TypeScript and Zod validation
- Supports large datasets via IndexedDB
- Workflow-based session management with nodes

### Discord Integration

The app integrates with Discord API directly from the browser using a custom client.

**Discord Client** (`src/discord.ts`):
```tsx#discord.ts
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import z from "zod";

export class ApiClient {
  private readonly token: string;
  private readonly baseUrl = "https://discord.com/api/v10";

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        "Content-Type": "application/json",
      },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Discord API Error: ${response.status} ${response.statusText}`);
    }

    return response.status === 204 ? undefined : response.json();
  }

  async getProfile() {
    // Get bot user profile
  }

  async getGuilds() {
    // List all guilds the bot has access to
  }

  async createRole(data: { guildId: string; name: string }) {
    // Create a mentionable role
  }

  async createCategory(data: { guildId: string; name: string }) {
    // Create a category with locked @everyone permissions
  }

  async createChannel(data: {
    guildId: string;
    parentCategoryId: string;
    name: string;
    type: "text" | "voice";
    writerRoleIds: string[];
    readerRoleIds: string[];
  }) {
    // Create a text/voice channel with role-based permissions
  }

  async deleteChannel(data: { channelId: string }) {
    // Delete a channel
  }

  async deleteRole(data: { guildId: string; roleId: string }) {
    // Delete a role
  }

  async changeChannelPermissions(data: {
    channelId: string;
    writerRoleIds: string[];
    readerRoleIds: string[];
  }) {
    // Update channel permissions
  }
}
```

**Usage example:**
```tsx
import { DiscordBot } from "@/models";
import { ApiClient } from "@/api";

// Get bot from IndexedDB
const bot = await DiscordBot.getById("bot-id");
const client = new ApiClient(bot.token);

// List guilds
const guilds = await client.getGuilds();

// Create role
const role = await client.createRole({ guildId: "123", name: "Player" });

// Create category
const category = await client.createCategory({ guildId: "123", name: "Session" });

// Create channel
const channel = await client.createChannel({
  guildId: "123",
  parentCategoryId: category.id,
  name: "general",
  type: "text",
  writerRoleIds: [role.id],
  readerRoleIds: [],
});
```

**Notes:**
- Bot Token stored in browser IndexedDB (via DiscordBot model)
- Direct REST API calls to Discord API v10
- Type-safe with `discord-api-types` and Zod validation
- Permissions are carefully configured for role-based channel access (writers, readers)
- Writer roles: Can read, write messages, manage threads, send voice, etc.
- Reader roles: Can view, read history, connect to voice, speak, but cannot write
- @everyone role: Denied all permissions in categories (privacy by default)

### Project Structure

```
/
├── src/                       # Application source code
│   ├── main.tsx               # Application entry point
│   ├── styles.css             # Global styles with Tailwind CSS v4 + DaisyUI
│   ├── routes/                # TanStack Router file-based routes
│   │   ├── __root.tsx         # Root layout
│   │   ├── index.tsx          # Home page
│   │   ├── session.tsx        # Session management page
│   │   ├── bot/               # Discord bot management
│   │   │   ├── index.tsx      # Bot list page
│   │   │   └── new.tsx        # Bot registration page
│   │   └── template/          # Template management
│   │       ├── index.tsx      # Template list page
│   │       ├── new.tsx        # Template creation page
│   │       └── $id.tsx        # Template editor page
│   ├── models/                # Dexie.js models and Zod schemas
│   │   ├── index.ts           # Model exports
│   │   ├── DiscordBot.ts      # Discord bot model
│   │   ├── GameSession.ts     # Game session model
│   │   ├── SessionNode.ts     # Session workflow node model
│   │   ├── Guild.ts           # Discord guild model
│   │   ├── Category.ts        # Discord category model
│   │   ├── Channel.ts         # Discord channel model
│   │   ├── Role.ts            # Discord role model
│   │   ├── Template.ts        # Template model
│   │   └── TemplateNode.ts    # Template workflow node model
│   ├── components/            # Shared React components
│   │   ├── CreateSession.tsx  # Session creation form
│   │   ├── TemplateCard.tsx   # Template card component
│   │   ├── TemplateEditor.tsx # Template workflow editor
│   │   └── BotCard.tsx        # Bot card component
│   ├── theme/                 # Theme management
│   │   ├── index.ts           # Theme exports
│   │   ├── ThemeProvider.tsx  # Theme context provider
│   │   ├── ThemeSwichMenu.tsx # Theme switcher menu
│   │   └── ThemeIcon.tsx      # Theme icon component
│   ├── toast/                 # Toast notifications
│   │   └── ToastProvider.tsx  # Toast context provider
│   ├── db.ts                  # Dexie.js database setup
│   ├── discord.ts             # Discord API client
│   └── routeTree.gen.ts       # Generated router tree (auto-generated)
├── public/                    # Static assets
├── docs/                      # Documentation
│   └── node-workflow-system.md # Workflow system design doc
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite configuration
├── wrangler.toml              # Cloudflare Workers config
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── CLAUDE.md                  # AI assistant instructions
└── README.md                  # Project documentation
```

## Key Features

### Workflow-based Session Management
- Node-based workflow system for TRPG/Murder Mystery sessions
- Template system for reusable workflows
- Visual workflow editor using @xyflow/react
- Automatic Discord resource creation based on workflow steps

### Discord Integration Features
- Store multiple Discord bot tokens
- List all guilds the bot has access to
- Create categories with locked @everyone permissions
- Create text/voice channels with role-based permissions
- Create and delete roles
- Manage channel permissions dynamically

### Data Management
- All data stored locally in browser (IndexedDB)
- No backend server required
- Supports import/export for data portability (planned)
- Type-safe with Zod validation throughout
