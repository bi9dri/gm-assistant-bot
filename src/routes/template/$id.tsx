import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/template/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <>
      <h1>Template {id} Route</h1>
    </>
  );
}
