import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { TemplateCard } from "@/components/TemplateCard";
import { db } from "@/db";

export const Route = createFileRoute("/template/")({
  component: RouteComponent,
});

function RouteComponent() {
  const templates = useLiveQuery(() => db.Template.toArray());

  return (
    <>
      <h1 className="text-3xl inline-block">テンプレート</h1>
      <Link to="/template/new" className="btn btn-primary ml-8 mb-4">
        新しいテンプレートを作成
      </Link>
      <div className="flex flex-wrap gap-8">
        {templates && templates.length === 0 ? (
          <div className="w-full text-center py-16">
            <p className="text-base-content/30 text-lg">テンプレートが作成されていません</p>
          </div>
        ) : (
          templates?.map((t) => (
            <TemplateCard key={t.id} id={t.id} name={t.name} updatedAt={t.updatedAt} />
          ))
        )}
      </div>
    </>
  );
}
