import { createFileRoute } from "@tanstack/react-router";

// 同一オリジン `/api` 中継。preview の origin はデプロイごとに変わるため本番 API の
// CORS 許可 origin に足せず、Worker が本番 API へ転送する。
const PROD_API_ORIGIN = "https://gm-assistant-bot-api.bidri.dev";

// 転送先の上書き用 (staging 等)。未設定なら DEV=ローカル API、それ以外=本番 API。
function apiOrigin(): string {
  return (
    import.meta.env.VITE_API_PROXY_TARGET ??
    (import.meta.env.DEV ? "http://localhost:8787" : PROD_API_ORIGIN)
  );
}

// クライアントが相対 URL を使うビルド (api.ts と同じ解決) でのみ中継する。
// 本番ビルドは直接 API origin を叩くので、この route は 404 にして開かない。
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
