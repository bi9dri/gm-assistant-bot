import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { GameSession, db } from "@/db";
import { RunnerView } from "@/flow/runner/RunnerView";

export const Route = createFileRoute("/session/$id/steps")({
  component: RouteComponent,
  beforeLoad: () => ({ layoutMode: "full-height" as const }),
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  // useLiveQuery の undefined (ロード中) と not-found の undefined を null に正規化して区別する。
  const data = useLiveQuery(async () => {
    const session = await GameSession.getById(Number(id));
    if (!session) return { session: null, bot: undefined };
    const bot = await db.DiscordBot.get(session.botId);
    return { session, bot };
  }, [id]);

  if (data === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <h2 className="text-2xl font-bold">読み込み中...</h2>
      </div>
    );
  }

  if (data.session === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">セッションが見つかりません</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate({ to: "/session" })}
        >
          セッション一覧に戻る
        </button>
      </div>
    );
  }

  if (data.bot === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <h2 className="text-2xl font-bold">Bot が見つかりません</h2>
      </div>
    );
  }

  return <RunnerView session={data.session} bot={data.bot} />;
}
