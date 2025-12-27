import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";

import { BotCard } from "@/components/BotCard";
import { db } from "@/db";

export const Route = createFileRoute("/bot/")({
  component: RouteComponent,
});

function RouteComponent() {
  const bots = useLiveQuery(() => db.DiscordBot.toArray());

  return (
    <>
      <h1 className="text-3xl inline-block">Discord Bot</h1>
      <Link to="/bot/new" className="btn btn-primary ml-8 mb-4">
        新しいBotを追加
      </Link>
      <div className="flex flex-wrap gap-8">
        {bots?.map((bot) => (
          <BotCard key={bot.id} id={bot.id} name={bot.name} icon={bot.icon} />
        ))}
      </div>
    </>
  );
}
