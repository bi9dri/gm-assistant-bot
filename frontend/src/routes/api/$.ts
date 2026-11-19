import { createFileRoute } from "@tanstack/react-router";

const PROD_API_ORIGIN = "https://gm-assistant-bot-api.bidri.dev";

function apiOrigin(): string {
  return (
    import.meta.env.VITE_API_PROXY_TARGET ??
    (import.meta.env.DEV ? "http://localhost:8787" : PROD_API_ORIGIN)
  );
}

function relayEnabled(): boolean {
  return (import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : PROD_API_ORIGIN)) === "";
}

function proxy(request: Request): Promise<Response> {
  if (!relayEnabled()) return Promise.resolve(new Response("Not Found", { status: 404 }));
  const url = new URL(request.url);
  return fetch(new URL(url.pathname + url.search, apiOrigin()), request);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxy(request),
      POST: ({ request }) => proxy(request),
      PATCH: ({ request }) => proxy(request),
      DELETE: ({ request }) => proxy(request),
      OPTIONS: ({ request }) => proxy(request),
    },
  },
});
