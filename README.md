# gm-assistant-bot

GameMaster's Assistant is a Discord bot designed to streamline tabletop RPG and murder mystery game sessions by automating common GM tasks, enabling game masters to focus on storytelling and player engagement.

## Architecture

- **Backend**: TypeScript application server with dual deployment
  - Local development: Bun runtime
  - Production: Cloudflare Workers
- **API Layer**: Hono framework with Zod validation for type-safe communication
- **Frontend**: React SSG application with HeroUI
  - Local development: Bun with HMR
  - Production: Cloudflare Workers Static Assets

## Project Structure

```
.
├── backend/              # Backend application
│   ├── src/
│   │   ├── types/       # Shared Zod schemas
│   │   └── index.ts     # Hono app (Bun dev + Workers)
│   └── wrangler.toml    # Cloudflare Workers config
├── ui/                  # Frontend applications
│   └── web/             # React SSG Web UI
│       ├── src/
│       │   ├── pages/   # Page components
│       │   ├── lib/     # API client & utilities
│       │   ├── styles/  # Tailwind CSS v4 config
│       │   ├── app.tsx  # Root component (HeroUIProvider)
│       │   └── index.ts # Hono app (SSG + Bun dev server)
│       └── wrangler.toml # Cloudflare Workers config
└── package.json         # Root workspace config
```

## Tech Stack

### Backend
- **Runtime**: Bun (local) / Cloudflare Workers (production)
- **Language**: TypeScript
- **Framework**: Hono v4.7.11
- **Middleware**: CORS, Logger
- **Database**: TBD
- **Validation**: Zod v4.1.13

### Frontend
- **Framework**: React 19.2.1
- **UI Library**: HeroUI v2.8.5
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **API Client**: Fetch with Zod validation
- **SSG**: Hono's toSSG() helper + Bun.build()

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

- `GET /api/health` - Basic health check (backend)

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
- Health check endpoint at `/api/health`
- CORS enabled for cross-origin requests
- Type-safe API with Hono + Zod schemas
- Single entry point for both Bun and Cloudflare Workers

### Frontend
- Modern React 19 with HeroUI components
- Type-safe API calls with Zod validation
- Static Site Generation via Hono's SSG helper
- Beautiful gradient background
- Responsive design with Tailwind CSS v4
- Health check demo page
- Single entry point for dev server and SSG build

## Adding New API Endpoints

To add a new API endpoint:

1. Define the Zod schema in `backend/src/types/api.ts`:
```typescript
export const MyRequestSchema = z.object({
  name: z.string(),
});

export const MyResponseSchema = z.object({
  message: z.string(),
});

export type MyRequest = z.infer<typeof MyRequestSchema>;
export type MyResponse = z.infer<typeof MyResponseSchema>;
```

2. Add the route in `backend/src/index.ts`:
```typescript
app.post("/api/my-endpoint", async (c) => {
  const body = await c.req.json();
  const input = MyRequestSchema.parse(body); // Validate input

  const response: MyResponse = {
    message: `Hello, ${input.name}!`,
  };

  MyResponseSchema.parse(response); // Validate output
  return c.json(response);
});
```

3. Add the method to frontend API client in `ui/web/src/lib/api-client.ts`:
```typescript
export const api = {
  // ... existing methods
  async myEndpoint(request: MyRequest): Promise<MyResponse> {
    const response = await fetch(`${API_BASE_URL}/api/my-endpoint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return MyResponseSchema.parse(data); // Runtime validation
  },
} as const;
```

4. Use in frontend components:
```typescript
import { api } from '../lib/api-client';

const result = await api.myEndpoint({ name: "World" });
// Fully type-safe with runtime validation!
```

## License

MIT License
