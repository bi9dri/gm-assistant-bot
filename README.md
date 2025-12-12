# gm-assistant-bot

GameMaster's Assistant is a Discord bot designed to streamline tabletop RPG and murder mystery game sessions by automating common GM tasks, enabling game masters to focus on storytelling and player engagement.

## Architecture

- **Backend**: TypeScript application server with dual deployment
  - Local development: Bun runtime with hot reload
  - Production: Cloudflare Workers
- **API Layer**: Hono framework with Hono RPC for end-to-end type safety
- **Frontend**: React SPA with TanStack Router and DaisyUI
  - Local development: Vite with HMR
  - Production: Cloudflare Workers Static Assets

## Project Structure

```
.
├── backend/              # Backend application
│   ├── src/
│   │   ├── handler/     # Route handlers
│   │   └── index.ts     # Hono app (exports AppType for RPC)
│   ├── package.json
│   └── wrangler.toml    # Cloudflare Workers config
├── ui/                  # Frontend applications
│   └── web/             # React SPA with TanStack Router
│       ├── src/
│       │   ├── routes/  # File-based routes (TanStack Router)
│       │   ├── theme/   # Theme components
│       │   ├── api.ts   # Hono RPC client
│       │   └── main.tsx # Entry point
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── wrangler.toml
└── package.json         # Root workspace config
```

## Tech Stack

### Backend
- **Runtime**: Bun (local) / Cloudflare Workers (production)
- **Language**: TypeScript 5.9.3
- **Framework**: Hono 4.10.8
- **Middleware**: CORS, Logger
- **Database**: TBD
- **Validation**: @hono/zod-validator 0.7.5 + Zod 4.1.13

### Frontend
- **Framework**: React 19.2.3
- **UI Library**: DaisyUI 5.5.13
- **Styling**: Tailwind CSS 4.1.18
- **Routing**: TanStack Router 1.141.0 (file-based)
- **API Client**: Hono RPC (hono/client) - end-to-end type safety
- **Build Tool**: Vite 7.2.7
- **Testing**: Vitest 4.0.15 + Testing Library

### Development Tools
- **Linting**: oxlint 1.32.0
- **Formatting**: oxfmt 0.17.0
- **Type Checking**: oxlint-tsgolint 0.8.6 / TypeScript 5.9.3
- **Deployment**: Wrangler 4.54.0 (Cloudflare CLI)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3.4 or later
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (for deployment)

### Installation

```bash
bun install
```

### Development

#### Start Full Stack Development

Start both backend and frontend with hot reload (from root directory):

```bash
bun run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:3000 (Vite dev server)

#### Start Backend Only

From backend directory:

```bash
cd backend
bun run dev
```

Server will be available at http://localhost:3000

#### Start Frontend Only

From frontend directory:

```bash
cd ui/web
bun run dev
```

Server will be available at http://localhost:3000

#### Available Endpoints

- `GET /api/health` - Basic health check (backend)

### Building Frontend

Build the static site for production (from frontend directory):

```bash
cd ui/web
bun run build
```

Output will be in `ui/web/dist/`

### Testing with Preview

**Backend (Cloudflare Workers runtime):**
```bash
cd backend
bun run preview
```

Server will be available at http://localhost:8787

**Frontend (Vite preview):**
```bash
cd ui/web
bun run preview
```

Server will be available at http://localhost:4173

### Linting

**Project-wide (from root directory):**
```bash
# Run linter for all packages
bun run lint

# Format code for all packages
bun run format

# Type checking for all packages
bun run type-check
```

**Individual service:**
```bash
# Backend
cd backend
bun run lint

# Frontend
cd ui/web
bun run lint
```

## Deployment

### Deploy to Cloudflare Workers:

**Backend:**
```bash
cd backend
bun run deploy
```

**Frontend:**
```bash
cd ui/web
# Build first
bun run build

# Then deploy
bun run deploy
```

**Deploy All (from root directory):**
```bash
bun run deploy
```

## Development Workflow

### Backend
1. **Local Development**: `cd backend && bun run dev` for fast iteration with Bun's hot reload
2. **Preview**: `cd backend && bun run preview` to test with production runtime (workerd)
3. **Deploy**: `cd backend && bun run deploy` to deploy to Cloudflare Workers

### Frontend
1. **Local Development**: `cd ui/web && bun run dev` for fast iteration with Vite HMR
2. **Build**: `cd ui/web && bun run build` to generate static files
3. **Preview**: `cd ui/web && bun run preview` to test production build locally
4. **Deploy**: `cd ui/web && bun run deploy` to build and deploy to Cloudflare Workers

### Full Stack
1. **Development**: `bun run dev` (from root) to start both backend and frontend
2. **Deploy**: `bun run deploy` (from root) to deploy both services, or deploy individually from each directory

## Features

### Backend API
- Health check endpoint at `/api/health`
- CORS enabled for cross-origin requests
- Type-safe API with Hono RPC (end-to-end type safety)
- Request validation with @hono/zod-validator
- Single entry point for both Bun and Cloudflare Workers

### Frontend
- Modern React 19 with DaisyUI components
- Type-safe API calls via Hono RPC client (no manual type imports)
- File-based routing with TanStack Router
- Theme switching support (All DaisyUI themes including light, dark, cupcake, synthwave, etc.)
- Responsive design with Tailwind CSS v4
- Fast development with Vite HMR

## Adding New API Endpoints

To add a new API endpoint with full type safety via Hono RPC:

1. Create a handler in `backend/src/handler/`:
```typescript
// backend/src/handler/greet.ts
import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import z from "zod";

export const validator = zValidator(
  "json",
  z.object({
    name: z.string(),
  })
);

export const handler = (c: Context) => {
  const { name } = c.req.valid("json");
  return c.json({
    message: `Hello, ${name}!`,
  });
};
```

2. Add the route in `backend/src/index.ts`:
```typescript
import * as greet from "./handler/greet";

const route = app
  .get("/health", healthcheck.validator, healthcheck.handler)
  .post("/greet", greet.validator, greet.handler); // Add new route

export type AppType = typeof route; // Type automatically includes new route
```

3. Use in frontend - no manual client code needed!
```typescript
// ui/web/src/routes/index.tsx
import api from "../api";

const response = await api.greet.$post({
  json: { name: "World" },
});
const data = await response.json();
// `data.message` is fully typed automatically!
console.log(data.message); // "Hello, World!"
```

That's it! Types flow automatically from backend to frontend via Hono RPC.

## License

MIT License
