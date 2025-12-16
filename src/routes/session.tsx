import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/session")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/session"!</div>;
}
