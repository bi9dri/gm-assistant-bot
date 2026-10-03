import { readFileSync } from "node:fs";

import { describe, test, expect } from "vite-plus/test";

import { CONTENT_SECURITY_POLICY } from "./csp";

describe("Content-Security-Policy", () => {
  test("script-src に 'unsafe-inline' を含む (Start SSR のインライン script 用)", () => {
    const scriptSrc = CONTENT_SECURITY_POLICY.split(";").find((d) =>
      d.trim().startsWith("script-src"),
    );
    expect(scriptSrc).toContain("'unsafe-inline'");
    // ハッシュ許可はビルドごとに変わる Start の出力と一致しない。混在させない。
    expect(CONTENT_SECURITY_POLICY).not.toContain("sha256-");
  });

  test("public/_headers と同一 policy (二箇所の drift 防止)", () => {
    const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf-8");
    expect(headers).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
  });
});
