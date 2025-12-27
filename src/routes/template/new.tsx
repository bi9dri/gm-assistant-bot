import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { TemplateEditor } from "@/components/TemplateEditor";

export const Route = createFileRoute("/template/new")({
  component: RouteComponent,
  beforeLoad: () => {
    return {
      layoutMode: "full-height" as const,
    };
  },
});

function RouteComponent() {
  const [templateName, setTemplateName] = useState("");

  const handleSave = () => {
    // TODO: db.Template.add()を使った保存ロジックを実装
    console.log("Saving template:", templateName);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-3 bg-base-200 border-b border-base-300">
        <input
          type="text"
          placeholder="テンプレート名を入力"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="input input-bordered flex-1 max-w-md"
        />
        <button onClick={handleSave} disabled={!templateName.trim()} className="btn btn-primary">
          保存
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <TemplateEditor nodes={[]} edges={[]} />
      </div>
    </div>
  );
}
