import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect } from "react";

import { TemplateEditor } from "@/components/TemplateEditor";
import { GameSession } from "@/db";
import { db } from "@/db";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

export const Route = createFileRoute("/session/$id")({
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

  const session = useLiveQuery(() => GameSession.getById(Number(id)));
  const guild = useLiveQuery(() => (session ? db.Guild.get(session.guildId) : undefined));

  const [sessionName, setSessionName] = useState("");
  const [previousSessionId, setPreviousSessionId] = useState<number | null>(null);

  useEffect(() => {
    const currentId = Number(id);
    if (session && previousSessionId !== currentId) {
      useTemplateEditorStore.getState().reset();
      setPreviousSessionId(currentId);
      setSessionName(session.name);
    } else if (session && previousSessionId === currentId) {
      setSessionName(session.name);
    }
  }, [session, id, previousSessionId]);

  const handleSave = async () => {
    if (!session) {
      return;
    }

    try {
      const { nodes, edges, viewport } = useTemplateEditorStore.getState();
      await session.update({
        name: sessionName,
        reactFlowData: { nodes, edges, viewport },
      });

      addToast({
        message: "セッションを保存しました",
        durationSeconds: 5,
      });
    } catch (error) {
      console.error("Failed to save session:", error);
      addToast({
        message: "セッションの保存に失敗しました",
        status: "error",
      });
    }
  };

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">読み込み中...</h2>
        </div>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">セッションが見つかりません</h2>
          <button onClick={() => navigate({ to: "/session" })} className="btn btn-primary">
            セッション一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const reactFlowData = session.getParsedReactFlowData();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-3 bg-base-200 border-b border-base-300">
        <div className="flex items-center gap-2">
          <img
            src={guild?.icon}
            alt={guild?.name || "Discord Server"}
            className="w-8 h-8 rounded"
          />
          <span className="text-sm font-medium">{guild?.name || "読み込み中..."}</span>
        </div>

        <input
          type="text"
          placeholder="セッション名を入力"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="input input-bordered flex-1 max-w-md"
        />

        <button onClick={handleSave} disabled={!sessionName.trim()} className="btn btn-primary">
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
