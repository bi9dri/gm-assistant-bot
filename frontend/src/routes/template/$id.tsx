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
        <div className="relative group">
          <div className="btn btn-ghost btn-circle btn-sm" aria-label="操作ヒント">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 p-4 shadow-lg bg-base-100 rounded-box w-64 border border-base-300">
            <h4 className="font-bold mb-2">操作ガイド</h4>
            <ul className="text-sm space-y-1">
              <li>・右クリックでノードを追加</li>
              <li>・ノード上で右クリックで複製・削除</li>
              <li>・ドラッグでノードを移動</li>
              <li>・ハンドルをドラッグで接続</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TemplateEditor
          templateId={Number(id)}
          nodes={reactFlowData.nodes}
          edges={reactFlowData.edges}
          viewport={reactFlowData.viewport}
        />
      </div>
    </div>
  );
}
