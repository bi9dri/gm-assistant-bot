import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

// server でのみ生成する。client は Start が出す csp-nonce meta から読む。
// node:crypto ではなく Web Crypto (workerd / Node / browser 共通) を使う。
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
