import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { LuCheck, LuPanelRight } from "react-icons/lu";

import { TemplateEditor } from "@/components/TemplateEditor";
import { GameSession } from "@/db";
import { db } from "@/db";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";

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

  const data = useLiveQuery(async () => {
    const session = await GameSession.getById(Number(id));
    if (!session) {
      return { session: null, guild: undefined, bot: undefined };
    }
    const guild = await db.Guild.get(session.guildId);
    const bot = await db.DiscordBot.get(session.botId);
    return { session, guild, bot };
  }, [id]);

  const session = data?.session;
  const guild = data?.guild;
  const bot = data?.bot;

  const [sessionName, setSessionName] = useState("");
  const [previousSessionId, setPreviousSessionId] = useState<number | null>(null);
  const [showResourcePanel, setShowResourcePanel] = useState(false);

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

  // 自動保存（実行モード時は常に有効）
  const { showSaved } = useAutoSave({
    sessionId: session?.id,
    enabled: !!session,
  });

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
        <input
          type="text"
          placeholder="セッション名を入力"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="input input-bordered flex-1 max-w-md"
        />

        {showSaved && (
          <span className="flex items-center gap-1 text-success text-sm">
            <LuCheck size={16} />
            保存しました
          </span>
        )}

        <div className="flex-1" />

        <div className="tooltip tooltip-bottom" data-tip="リソースパネル">
          <button
            onClick={() => setShowResourcePanel(!showResourcePanel)}
            className="btn btn-ghost btn-square"
            aria-label="リソースパネルを開く"
          >
            <LuPanelRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {guild ? (
            <>
              <img src={guild.icon} alt={guild.name} className="w-8 h-8 rounded" />
              <span className="text-sm font-medium">{guild.name}</span>
            </>
          ) : (
            <>
              <div className="skeleton w-8 h-8 rounded shrink-0"></div>
              <div className="skeleton h-4 w-24"></div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {bot ? (
            <>
              <img src={bot.icon} alt={bot.name} className="w-8 h-8 rounded-full" />
              <span className="text-sm font-medium">{bot.name}</span>
            </>
          ) : (
            <>
              <div className="skeleton w-8 h-8 rounded-full shrink-0"></div>
              <div className="skeleton h-4 w-24"></div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TemplateEditor
          nodes={reactFlowData.nodes}
          edges={reactFlowData.edges}
          viewport={reactFlowData.viewport}
          mode="execute"
          guildId={session.guildId}
          sessionId={session.id}
          sessionName={sessionName}
          bot={bot}
          showResourcePanel={showResourcePanel}
          onToggleResourcePanel={() => setShowResourcePanel(!showResourcePanel)}
        />
      </div>
    </div>
  );
}
