# gm-assistant-bot

GameMaster's Assistant is a Discord bot designed to streamline tabletop RPG and murder mystery game sessions by automating common GM tasks, enabling game masters to focus on storytelling and player engagement.

## Architecture

- **Backend**: TypeScript application server with dual deployment
  - Local development: Bun runtime
  - Production: Cloudflare Workers
- **API Layer**: oRPC for end-to-end type-safe communication
- **Frontend**: React-based web UI (planned)

## Project Structure

```
.
├── backend/              # Backend application
│   ├── src/
│   │   ├── orpc/        # oRPC routers and context
│   │   ├── app.ts       # Core application logic
│   │   ├── index.ts     # Bun entry point (local dev)
│   │   └── worker.ts    # Cloudflare Workers entry point
│   ├── wrangler.toml    # Cloudflare Workers config
├── ui/                  # Frontend applications
│   └── web/            # Web UI (planned)
└── package.json        # Root workspace config
```

## Tech Stack

### Backend
- **Runtime**: Bun (local) / Cloudflare Workers (production)
- **Language**: TypeScript
- **API**: oRPC
- **Database**: IndexedDB / Dexie.js
- **Validation**: Zod

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

Start the local development server with hot reload:

```bash
bun run backend:dev
```

Server will be available at http://localhost:3000

#### Available Endpoints

- `GET /health` - Basic health check

### Testing with Wrangler

To test with the actual Cloudflare Workers runtime:

```bash
bun run backend:preview
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

```bash
bun run backend:deploy
```

## Development Workflow

1. **Local Development**: Use `bun run backend:dev` for fast iteration with Bun's hot reload
2. **Preview**: Use `bun run backend:preview` to test with production runtime (workerd)
3. **Deploy**: Use `bun run backend:deploy` to deploy to Cloudflare Workers

## Adding New API Endpoints
TBD

## License

MIT License
