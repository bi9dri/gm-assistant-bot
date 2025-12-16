import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { DiscordProfile } from "../models/discordProfile";
import { CreateDiscordProfileForm } from "@/components/CreateDiscordProfileForm";
import { EditDiscordProfileForm } from "@/components/EditDiscordProfileForm";
import { useToast } from "@/toast/ToastProvider";
import { ZodError } from "zod";

export const Route = createFileRoute("/discordProfile")({
  component: RouteComponent,
});

function RouteComponent() {
  const profiles = useLiveQuery(() => DiscordProfile.getAll());
  const { addToast } = useToast();

  const handleCreate = async (
    name: string,
    icon: string,
    description: string,
  ) => {
    try {
      const profile = new DiscordProfile(name, icon, description);
      await profile.save();
      addToast({
        message: "プロフィールを追加しました",
        durationSeconds: 10,
      });
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
          message: "プロフィールの追加に失敗しました",
          status: "error",
        });
      }
      throw error;
    }
  };

  return (
    <>
      <h1 className="text-3xl mb-8">Discord Profiles</h1>
      <CreateDiscordProfileForm onSubmit={handleCreate} />
      <div className="divider"></div>
      <div className="flex flex-wrap gap-8">
        {profiles?.map((profile) => (
          <EditDiscordProfileForm key={profile.id!} profileId={profile.id!} />
        ))}
      </div>
    </>
  );
}
