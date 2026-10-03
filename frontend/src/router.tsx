import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

// リクエストごとに一意な CSP nonce。server でのみ生成する (client は Start が出す
// csp-nonce meta から読むため undefined でよい)。node: 系 import は client
// バンドルを壊すので Web Crypto (workerd・Node どちらにもある) を使う。
function generateNonce(): string | undefined {
  if (typeof window !== "undefined") return undefined;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function getRouter() {
  return createRouter({
    routeTree,
    context: {},
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    ssr: { nonce: generateNonce() },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
