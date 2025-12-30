import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CreateSession } from "@/components/CreateSession";

export const Route = createFileRoute("/session/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const handleCreate = async () => {
    await navigate({ to: "/session" });
  };

  const handleCancel = () => {
    void navigate({ to: "/session" });
  };

  return (
    <>
      <h1 className="text-3xl mb-8">新しいセッションを作成</h1>
      <CreateSession onCreate={handleCreate} onCancel={handleCancel} />
    </>
  );
}
