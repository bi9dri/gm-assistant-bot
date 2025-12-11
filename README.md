# gm-assistant-bot

GameMaster's Assistant is a Discord bot designed to streamline tabletop RPG and murder mystery game sessions by automating common GM tasks, enabling game masters to focus on storytelling and player engagement.

## Architecture

- **Backend**: TypeScript application server with dual deployment
  - Local development: Bun runtime
  - Production: Cloudflare Workers
- **API Layer**: oRPC for end-to-end type-safe communication
- **Frontend**: React SSG application with HeroUI
  - Local development: Bun with HMR
  - Production: Cloudflare Workers Static Assets

## Project Structure

```
.
├── backend/              # Backend application
│   ├── src/
│   │   ├── orpc/        # oRPC routers and context
│   │   ├── app.ts       # Core application logic (with CORS)
│   │   ├── index.ts     # Bun entry point (local dev)
│   │   └── worker.ts    # Cloudflare Workers entry point
│   └── wrangler.toml    # Cloudflare Workers config
├── ui/                  # Frontend applications
│   └── web/             # React SSG Web UI
│       ├── src/
│       │   ├── pages/   # Page components
│       │   ├── lib/     # oRPC client & utilities
│       │   ├── styles/  # Tailwind CSS v4 config
│       │   ├── app.tsx  # Root component (HeroUIProvider)
│       │   ├── index.ts # Bun dev server
│       │   ├── build.ts # SSG build script
│       │   └── worker.ts # Cloudflare Workers handler
│       └── wrangler.toml # Cloudflare Workers config
└── package.json         # Root workspace config
```

## Tech Stack

### Backend
- **Runtime**: Bun (local) / Cloudflare Workers (production)
- **Language**: TypeScript
- **API**: oRPC with CORSPlugin
- **Database**: IndexedDB / Dexie.js
- **Validation**: Zod

### Frontend
- **Framework**: React 19.2.1
- **UI Library**: HeroUI v3
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **API Client**: @orpc/client (type-safe)
- **SSG**: Custom Bun-based build script

### Development Tools
- **Linting**: oxlint
- **Type Checking**: oxlint-tsgolint / TypeScript
- **Deployment**: Wrangler (Cloudflare CLI)

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

Start both backend and frontend with hot reload:

```bash
bun run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:3001

#### Start Backend Only

```bash
bun run backend:dev
```

Server will be available at http://localhost:3000

#### Start Frontend Only

```bash
bun run web:dev
```

Server will be available at http://localhost:3001

#### Available Endpoints

- `GET /rpc/health` - Basic health check (backend)

### Building Frontend

Build the static site for production:

```bash
bun run web:build
```

Output will be in `ui/web/dist/`

### Testing with Wrangler

To test with the actual Cloudflare Workers runtime:

**Backend:**
```bash
bun run backend:preview
```

Server will be available at http://localhost:8787

**Frontend:**
```bash
bun run web:preview
```

Server will be available at http://localhost:8787

### Linting

```bash
# Run linter
bun run lint

# Auto-fix issues
bun run lint:fix

# Type checking
bun run type-check
```

## Deployment

### Deploy to Cloudflare Workers:

**Backend:**
```bash
bun run backend:deploy
```

**Frontend:**
```bash
# Build first
bun run web:build

# Then deploy
bun run web:deploy
```

## Development Workflow

### Backend
1. **Local Development**: Use `bun run backend:dev` for fast iteration with Bun's hot reload
2. **Preview**: Use `bun run backend:preview` to test with production runtime (workerd)
3. **Deploy**: Use `bun run backend:deploy` to deploy to Cloudflare Workers

### Frontend
1. **Local Development**: Use `bun run web:dev` for fast iteration with HMR
2. **Build**: Use `bun run web:build` to generate static files
3. **Preview**: Use `bun run web:preview` to test with Workers runtime
4. **Deploy**: Use `bun run web:deploy` to deploy to Cloudflare Workers

### Full Stack
1. **Development**: Use `bun run dev` to start both backend and frontend
2. **Deploy**: Deploy backend first, then frontend

## Features

### Backend API
- Health check endpoint at `/rpc/health`
- CORS enabled for cross-origin requests
- Type-safe API with oRPC

### Frontend
- Modern React 19 with HeroUI components
- Type-safe API calls with oRPC client
- Static Site Generation (SSG)
- Beautiful gradient background
- Responsive design with Tailwind CSS v4
- Health check demo page

## Adding New API Endpoints

To add a new API endpoint:

1. Define the contract in `backend/src/orpc/router.ts`:
```typescript
export const contract = {
  health: oc.input(z.void()).output(...).route({ method: "GET", path: "/health" }),
  // Add your new endpoint
  myEndpoint: oc.input(z.object({ ... })).output(z.object({ ... })).route({ method: "POST", path: "/my-endpoint" }),
};
```

2. Implement the handler:
```typescript
export const router = os.router({
  health: os.handler(() => ({ status: "ok", timestamp: new Date().toISOString() })),
  // Add your handler
  myEndpoint: os.handler(async (input) => {
    // Your logic here
    return { ... };
  }),
});
```

3. Use in frontend via the type-safe client:
```typescript
import { api } from '../lib/orpc-client';

const result = await api.myEndpoint({ ... });
// Fully type-safe!
```

## License

MIT License
