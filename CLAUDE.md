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

### Frontend-Only SPA
- **Single-page application** built with React 19
- **Deployment**: Cloudflare Workers Static Assets
- **Entry point**: `src/main.tsx` - React app with TanStack Router
- **Build**: Vite build + TypeScript compilation
- **UI**: React 19 + DaisyUI + Tailwind CSS v4
- **Routing**: TanStack Router with file-based routing
- **Data Persistence**: Dexie.js (IndexedDB) with Zod validation
- **External Integration**: Discord via Webhooks (no backend server needed)

### Database
- **Dexie.js**: TypeScript-friendly wrapper for IndexedDB
- **Zod**: Schema validation for runtime type safety
- **Storage**: Browser-based IndexedDB (no backend server required)
- **Data Models**: Discord profiles, sessions, templates
- **Future**: Import/export functionality planned

### Development Tools
- **Vite** for frontend development and bundling (with HMR)
- **TanStack Router** for file-based routing with type safety
- **Bun** for package management and testing
- **Wrangler** for Cloudflare Workers deployment

## Development Commands

All commands should be run from the repository root:

```bash
# Start development server with Vite HMR (port 3000)
fish -c "bun run dev"

# Build static files for production
fish -c "bun run build"

# Preview production build (port 4173)
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

Discord integration uses Webhooks for sending messages from the browser:

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

**Notes:**
- Webhook URLs are stored in the Dexie.js database (not environment variables)
- Each Discord profile can have its own webhook URL
- No backend server needed - direct browser-to-Discord communication

### Project Structure

```
/
├── src/
│   ├── main.tsx           # Application entry point
│   ├── styles.css         # Global styles with Tailwind + DaisyUI
│   ├── routes/            # TanStack Router file-based routes
│   │   ├── __root.tsx     # Root layout
│   │   ├── index.tsx      # Home page
│   │   ├── discordWebhook.tsx # Discord Webhook management
│   │   ├── session.tsx    # Session management
│   │   └── template.tsx   # Template management
│   ├── db/                # Dexie.js database setup
│   │   ├── schema.ts      # Zod schemas and TypeScript types
│   │   └── index.ts       # Database initialization
│   ├── components/        # Shared React components
│   │   ├── forms/         # Form components (Create/Edit)
│   │   └── ui/            # UI components
│   └── theme/             # Theme management
│       ├── ThemeProvider.tsx
│       ├── ThemeIcon.tsx
│       └── ThemeSwichMenu.tsx
├── public/                # Static assets
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── wrangler.toml          # Cloudflare Workers config
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
