import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

async function enableMockingIfNeeded(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MSW !== "true") return;
  const { worker } = await import("../test/vrt/msw/browser");
  await worker.start({ onUnhandledFrame: "bypass" });
  const { db } = await import("./db");
  (window as unknown as { __vrtDb: typeof db }).__vrtDb = db;
  const { FileSystem } = await import("./fileSystem");
  (window as unknown as { __vrtFs: unknown }).__vrtFs = new FileSystem();
}

await enableMockingIfNeeded();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
