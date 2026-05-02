import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { routeTree } from "./routeTree.gen";
import "./styles.css";

async function enableMockingIfNeeded(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MSW !== "true") return;
  const { worker } = await import("../test/vrt/msw/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

void enableMockingIfNeeded().then(() => {
  const rootElement = document.getElementById("app");
  if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  }
});
