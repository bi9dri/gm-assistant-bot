import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect } from "react";

import { TemplateEditor } from "@/components/TemplateEditor";
import { Template } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

export const Route = createFileRoute("/template/$id")({
  component: RouteComponent,
  beforeLoad: () => {
    return {
      layoutMode: "full-height" as const,
    };
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const template = useLiveQuery(() => Template.getById(Number(id)));

  const [templateName, setTemplateName] = useState("");
  const [previousTemplateId, setPreviousTemplateId] = useState<number | null>(null);

  useEffect(() => {
    const currentId = Number(id);
    if (template && previousTemplateId !== currentId) {
      useTemplateEditorStore.getState().reset();
      setPreviousTemplateId(currentId);
      setTemplateName(template.name);
    } else if (template && previousTemplateId === currentId) {
      setTemplateName(template.name);
    }
  }, [template, id, previousTemplateId]);

  const handleSave = async () => {
    if (!template) {
      return;
    }

    try {
      const { nodes, edges, viewport } = useTemplateEditorStore.getState();
      await template.update({
        name: templateName,
        reactFlowData: { nodes, edges, viewport },
      });

      addToast({
        message: "テンプレートを保存しました",
        durationSeconds: 5,
      });
    } catch (error) {
      console.error("Failed to save template:", error);
      addToast({
        message: "テンプレートの保存に失敗しました",
        status: "error",
      });
    }
  };

  if (template === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">読み込み中...</h2>
        </div>
      </div>
    );
  }

  if (template === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">テンプレートが見つかりません</h2>
          <button onClick={() => navigate({ to: "/template" })} className="btn btn-primary">
            テンプレート一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const reactFlowData = template.getParsedReactFlowData();

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
        <TemplateEditor
          nodes={reactFlowData.nodes}
          edges={reactFlowData.edges}
          viewport={reactFlowData.viewport}
        />
      </div>
    </div>
  );
}
