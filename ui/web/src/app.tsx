import React from "react";
import { createRoot } from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { Home } from "./pages/Home";
import "./styles/index.css";

export default function App() {
  return (
    <HeroUIProvider>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Home />
      </main>
    </HeroUIProvider>
  );
}

// Client-side hydration
if (typeof document !== "undefined") {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}
