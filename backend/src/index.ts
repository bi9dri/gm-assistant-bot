import { createApp } from "./app.ts";

const app = createApp();

const server = Bun.serve({
  port: process.env.PORT ?? 3000,
  fetch: (request) => app.fetch(request),
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📍 Health check: http://localhost:${server.port}/health`);
