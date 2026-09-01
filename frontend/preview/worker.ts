// PR preview 専用 Worker。本番 API の CORS 許可 origin は本番フロントのみなので、
// preview から直接叩くとブロックされる。同一オリジンの /api を本番 API へ中継して回避する。
const API_ORIGIN = "https://gm-assistant-bot-api.bidri.dev";

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    return fetch(new Request(new URL(url.pathname + url.search, API_ORIGIN), request));
  },
};
