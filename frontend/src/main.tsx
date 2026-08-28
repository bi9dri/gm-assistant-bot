import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { routeTree } from "./routeTree.gen";

import "./styles.css";

async function enableMockingIfNeeded(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MSW !== "true") return;
  const { worker } = await import("../test/vrt/msw/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
  // VRT 用に Dexie インスタンスと OPFS を露出。fixture から page.evaluate 経由で seed するため。
  const { db } = await import("./db");
  (window as unknown as { __vrtDb: typeof db }).__vrtDb = db;
  const { FileSystem } = await import("./fileSystem");
  // 型は unknown で十分 (DOM の組み込み FileSystem 型と名前が衝突するため明示しない)。
  (window as unknown as { __vrtFs: unknown }).__vrtFs = new FileSystem();
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
