import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bot/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1>Bot Management - New Bot</h1>
    </>
  );
}
