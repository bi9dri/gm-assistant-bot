import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { Template } from "@/db";
import { StepsEditor } from "@/flow/components/StepsEditor";

export const Route = createFileRoute("/template/$id/steps")({
  component: RouteComponent,
  beforeLoad: () => ({ layoutMode: "full-height" as const }),
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  // useLiveQuery の undefined (ロード中) と Template.getById の undefined (not-found) を
  // null に正規化して区別する (既存 routes/template/$id.tsx と同じ規約)。
  const template = useLiveQuery(async () => (await Template.getById(Number(id))) ?? null, [id]);

  if (template === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <h2 className="text-2xl font-bold">読み込み中...</h2>
      </div>
    );
  }

  if (template === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">テンプレートが見つかりません</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate({ to: "/template" })}
        >
          テンプレート一覧に戻る
        </button>
      </div>
    );
  }

  return <StepsEditor template={template} />;
}
