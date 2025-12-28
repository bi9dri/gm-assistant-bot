import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { TemplateEditor } from "@/components/TemplateEditor";
import { Template } from "@/models";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

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
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSave = async () => {
    try {
      const { nodes, edges, viewport } = useTemplateEditorStore.getState();
      const template = await Template.create(templateName);
      await template.update(undefined, { nodes, edges, viewport });

      addToast({
        message: `テンプレート「${templateName}」を作成しました`,
        durationSeconds: 5,
      });

      void navigate({ to: "/template/$id", params: { id: template.id.toString() } });
    } catch (error) {
      console.error("Failed to save template:", error);
      addToast({
        message: "テンプレートの保存に失敗しました",
        status: "error",
      });
    }
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
