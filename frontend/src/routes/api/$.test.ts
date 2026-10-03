import { describe, test, expect, vi, beforeEach, afterEach } from "vite-plus/test";

import { Route } from "./$";

const originalFetch = globalThis.fetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFetch: any;

const server = Route.options.server;
if (!server) throw new Error("server handlers missing");
const handlers = server.handlers as Record<
  string,
  (ctx: { request: Request }) => Promise<Response>
>;

beforeEach(() => {
  vi.stubEnv("VITE_API_PROXY_TARGET", "https://gm-assistant-bot-api.bidri.dev");
  mockFetch = vi.fn((url: URL) =>
    Promise.resolve(new Response(`proxied:${url.pathname}${url.search}`, { status: 200 })),
  );
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = originalFetch;
});

describe("/api 中継", () => {
  test("パスとクエリを保ったまま本番 API へ転送する", async () => {
    const res = await handlers.GET({
      request: new Request("https://preview.workers.dev/api/guilds?x=1"),
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url.href).toBe("https://gm-assistant-bot-api.bidri.dev/api/guilds?x=1");
    expect(await res.text()).toBe("proxied:/api/guilds?x=1");
  });

  test("メソッド・ヘッダー・ボディを引き継ぐ", async () => {
    const body = JSON.stringify({ guildId: "g1" });
    await handlers.POST({
      request: new Request("https://preview.workers.dev/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Discord-Bot-Token": "tok" },
        body,
      }),
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers.get("X-Discord-Bot-Token")).toBe("tok");
    expect(await init.text()).toBe(body);
  });

  for (const method of ["PATCH", "DELETE", "OPTIONS"]) {
    test(`${method} も中継する`, async () => {
      await handlers[method]({
        request: new Request("https://preview.workers.dev/api/channels", { method }),
      });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url.href).toBe("https://gm-assistant-bot-api.bidri.dev/api/channels");
      expect(init.method).toBe(method);
    });
  }
});
