import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { DiscordWebhook } from "../models/discordWebhook";
import { CreateDiscordWebhookForm } from "@/components/CreateDiscordWebhookForm";
import { EditWebhookForm } from "@/components/EditDiscordWebhookForm";
import { useToast } from "@/toast/ToastProvider";
import { ZodError } from "zod";

export const Route = createFileRoute("/discordWebhook")({
  component: RouteComponent,
});

function RouteComponent() {
  const webhooks = useLiveQuery(() => DiscordWebhook.getAll());
  const { addToast } = useToast();

  const handleCreate = async (name: string, url: string) => {
    try {
      const webhook = new DiscordWebhook(name, url);
      await webhook.save();
    } catch (error) {
      if (error instanceof ZodError) {
        addToast({
          message: error.issues.map((i) => i.message).join("\n"),
          status: "error",
        });
      } else if (error instanceof Error) {
        addToast({
          message: error.message,
          status: "error",
        });
        return;
      } else {
        addToast({
          message: "更新に失敗しました",
          status: "error",
        });
      }
      throw error;
    }
  };

  return (
    <>
      <h1 className="text-3xl mb-8">Discord Webhooks</h1>
      <CreateDiscordWebhookForm onSubmit={handleCreate} />
      <div className="divider"></div>
      <div className="flex flex-wrap gap-8">
        {webhooks?.map((webhook) => (
          <EditWebhookForm key={webhook.id!} webhookId={webhook.id!} />
        ))}
      </div>
    </>
  );
}
