import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { SessionCard } from "@/components/SessionCard";
import { db } from "@/db";

export const Route = createFileRoute("/session/")({
  component: RouteComponent,
});

function RouteComponent() {
  const sessions = useLiveQuery(() => db.GameSession.orderBy("lastUsedAt").reverse().toArray());

  return (
    <>
      <h1 className="text-3xl inline-block">セッション</h1>
      <Link to="/session/new" className="btn btn-primary ml-8 mb-4">
        新しいセッションを作成
      </Link>

      <div className="flex flex-wrap gap-8">
        {sessions && sessions.length === 0 ? (
          <div className="w-full text-center py-16">
            <p className="text-base-content/30 text-lg">セッションが作成されていません</p>
          </div>
        ) : (
          sessions?.map((session) => (
            <SessionCard
              key={session.id}
              id={session.id}
              name={session.name}
              guildId={session.guildId}
              createdAt={session.createdAt}
            />
          ))
        )}
      </div>
    </>
  );
}
