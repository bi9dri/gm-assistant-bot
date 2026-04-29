import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { routeTree } from "./routeTree.gen";
import "./styles.css";

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

declare global {
  interface Window {
    // VRT spec/fixture が MSW 起動完了を待つためのフラグ。MSW boot 失敗時はセットされない
    __MSW_READY__?: boolean;
  }
}

async function bootstrap() {
  // Vite env は常に文字列として注入されるため真偽値ではなく明示的に "true" と比較する
  if (import.meta.env.VITE_MSW_ENABLED === "true") {
    // dynamic import は load-bearing: prod bundle から MSW を tree-shake で除外するため static import にしないこと
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: import.meta.env.VITE_MSW_STRICT === "true" ? "error" : "warn",
    });
    window.__MSW_READY__ = true;
  }

  const rootElement = document.getElementById("app");
  if (!rootElement) {
    throw new Error("[bootstrap] #app element missing in index.html");
  }
  if (rootElement.innerHTML) {
    return;
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

bootstrap().catch((err: unknown) => {
  console.error("[bootstrap] fatal error", err);
  // VRT が真っ白 baseline をコミットする経路を塞ぐため #app に error 痕跡を残す。
  // fixtures.ts は data-bootstrap-error 付きの page を pageerror として検知して fail する想定
  const root = document.getElementById("app");
  if (root) {
    root.textContent = `Bootstrap failed: ${err instanceof Error ? err.message : String(err)}`;
    root.setAttribute("data-bootstrap-error", "true");
  }
});
