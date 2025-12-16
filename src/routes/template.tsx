import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/template")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/template"!</div>;
}
