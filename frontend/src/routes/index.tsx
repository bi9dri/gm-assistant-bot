import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1 style={{ color: "#ff0066" }}>GameMaster's Assistant bot (GMAssistant)へようこそ！</h1>
    </>
  );
}
