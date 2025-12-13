import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <h1>GameMaster's Assistant bot (GMAssistant)へようこそ！</h1>
    </>
  );
}
