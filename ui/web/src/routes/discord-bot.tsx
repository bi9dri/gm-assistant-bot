import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/discord-bot")({
  component: DiscordBotPage,
});

function DiscordBotPage() {
  return (
    <>
      <h1>Discord Bot 設定ページへようこそ！</h1>
      {/* botのプロフィール設定フォーム */}
      {/* サーバごとの画像、名前、説明 */}
      {/* https://discord.com/developers/docs/resources/application#edit-current-application */}
    </>
  );
}
