import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/template/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1>New Template Route</h1>
    </>
  );
}
