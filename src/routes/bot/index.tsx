import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bot")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1>Bot Management</h1>
    </>
  );
}
