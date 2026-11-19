import { describe, test, expect } from "vite-plus/test";

import { buildContentSecurityPolicy } from "./csp";

describe("Content-Security-Policy", () => {
  const policy = buildContentSecurityPolicy("dGVzdG5vbmNl");

  test("script-src は nonce 許可のみ (unsafe-inline・ハッシュ禁止)", () => {
    const scriptSrc = policy.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toContain("'nonce-dGVzdG5vbmNl'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("sha256-");
  });

  test("nonce 以外の文字列を埋め込まない", () => {
    expect(() => buildContentSecurityPolicy("a'b;c")).toThrow();
  });

  test("外部 script・API 接続先を保つ", () => {
    expect(policy).toContain("https://www.googletagmanager.com");
    expect(policy).toContain("https://static.cloudflareinsights.com");
    expect(policy).toContain("https://gm-assistant-bot-api.bidri.dev");
  });
});
