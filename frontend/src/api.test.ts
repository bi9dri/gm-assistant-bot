import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

import { ApiClient, BOT_TOKEN_HEADER } from "./api";

const originalFetch = globalThis.fetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFetch: any;

describe("ApiClient", () => {
  beforeEach(() => {
    mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ profile: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("トークンの送信", () => {
    test("リクエストヘッダーにトークンが含まれる", async () => {
      const client = new ApiClient("my-secret-token");

      await client.getProfile();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get(BOT_TOKEN_HEADER)).toBe("my-secret-token");
    });

    test("異なるトークンで異なるヘッダーが送信される", async () => {
      const client1 = new ApiClient("token-1");
      const client2 = new ApiClient("token-2");

      await client1.getProfile();
      const [, options1] = mockFetch.mock.calls[0];
      expect(options1.headers.get(BOT_TOKEN_HEADER)).toBe("token-1");

      await client2.getProfile();
      const [, options2] = mockFetch.mock.calls[1];
      expect(options2.headers.get(BOT_TOKEN_HEADER)).toBe("token-2");
    });

    test("空のトークンでもヘッダーが送信される", async () => {
      const client = new ApiClient("");

      await client.getProfile();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get(BOT_TOKEN_HEADER)).toBe("");
    });
  });

  describe("getErrorMessage（エラーレスポンス経由）", () => {
    test('{ error: "message" }からエラーメッセージを抽出する', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      const client = new ApiClient("test-token");
      expect(client.getProfile()).rejects.toThrow("Invalid token");
    });

    test("エラーが文字列でない場合はステータスコードを使用する", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 123 }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      const client = new ApiClient("test-token");
      expect(client.getProfile()).rejects.toThrow("404");
    });

    test("エラープロパティがない場合はステータスコードを使用する", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Something went wrong" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      const client = new ApiClient("test-token");
      expect(client.getProfile()).rejects.toThrow("500");
    });
  });
});
