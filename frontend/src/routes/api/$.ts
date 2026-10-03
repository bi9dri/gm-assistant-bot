import { createFileRoute } from "@tanstack/react-router";

// 同一オリジン `/api` 中継。preview の origin はデプロイごとに変わるため本番 API の
// CORS 許可 origin に足せず、Worker が本番 API へ転送する (旧 frontend/preview/worker.ts)。
// 本番ビルドは `VITE_API_BASE_URL` 未設定で直接 API origin を叩くのでここは通らない。
const PROD_API_ORIGIN = "https://gm-assistant-bot-api.bidri.dev";

// ビルド時に上書き可 (preview が本番以外へ向ける場合)。未設定なら DEV=ローカル API、それ以外=本番 API。
function apiOrigin(): string {
  return (
    import.meta.env.VITE_API_PROXY_TARGET ??
    (import.meta.env.DEV ? "http://localhost:8787" : PROD_API_ORIGIN)
  );
}

function proxy(request: Request): Promise<Response> {
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
