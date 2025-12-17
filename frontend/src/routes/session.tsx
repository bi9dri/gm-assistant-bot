import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/session")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1 className="text-3xl mb-8">セッション</h1>
    </>
  );
}
