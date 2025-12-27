import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/session/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <>
      <h1>Session {id} Route</h1>
    </>
  );
}
