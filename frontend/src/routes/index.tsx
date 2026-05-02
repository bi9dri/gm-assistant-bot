import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1
        style={{
          background: "#ff0066",
          color: "#ffffff",
          padding: "120px",
          fontSize: "64px",
          textAlign: "center",
        }}
      >
        GameMaster's Assistant bot (GMAssistant)へようこそ！
      </h1>
    </>
  );
}
