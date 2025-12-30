import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CreateBot } from "@/components/CreateBot";

export const Route = createFileRoute("/bot/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const handleCreate = () => {
    void navigate({ to: "/bot" });
  };

  const handleCancel = () => {
    void navigate({ to: "/bot" });
  };

  return <CreateBot onCreate={handleCreate} onCancel={handleCancel} />;
}
