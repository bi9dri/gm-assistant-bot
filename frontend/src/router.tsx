import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

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
