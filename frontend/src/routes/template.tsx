import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/template")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1>Template Route</h1>
    </>
  );
}
