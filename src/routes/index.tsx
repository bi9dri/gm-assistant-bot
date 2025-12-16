import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1>GameMaster's Assistant bot (GMAssistant)へようこそ！</h1>
    </>
  );
}
