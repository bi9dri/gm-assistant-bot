import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/template/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h1 className="text-3xl inline-block">テンプレート</h1>
      <Link to="/template/new" className="btn btn-primary ml-8 mb-4">
        新しいテンプレートを作成
      </Link>
    </>
  );
}
