import type z from "zod";

import { type MouseEvent, useEffect, useState } from "react";

import type { GuildSchema } from "@/models";

import { db } from "@/db";
import { useToast } from "@/toast/ToastProvider";

interface Props {
  onCreate?: (created: {}) => Promise<void>;
}

export const CreateSession = ({ onCreate }: Props) => {
  const { addToast } = useToast();
  const [guilds, setGuilds] = useState<z.infer<typeof GuildSchema>[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(-1);
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    void (async () => {
      // list discord bots

      // get guilds from discord api
      setGuilds([]);

      const tres = await db.Template.toArray();
      setTemplates(tres.map((t) => ({ id: t.id, name: t.name })) || []);
    })();
  }, []);

  const handleCreate = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const template = await db.Template.get(selectedTemplateId);
    if (!template) {
      addToast({
        message: "テンプレートの取得に失敗しました",
        status: "error",
      });
      return;
    }

    const newSessionId = await db.GameSession.add({
      name: sessionName,
      guildId: selectedGuildId,
      createdAt: new Date(),
    });

    addToast({
      message: `セッション「${sessionName}」を作成しました。`,
      status: "success",
      durationSeconds: 5,
    });

    if (onCreate) {
      await onCreate({ id: newSessionId });
    }
  };

  const valid =
    selectedGuildId !== "" && selectedTemplateId !== -1 && sessionName.trim().length > 0;

  return (
    <div className="card lg:w-120 w-full bg-base-200 rounded-xs border-2 border-secondary shadow-md">
      <div className="card-body">
        <h2 className="text-xl">新しいセッションを作成する</h2>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Discordサーバ</legend>
          <select
            className="select"
            value={selectedGuildId}
            onChange={(e) => setSelectedGuildId(e.target.value)}
          >
            <option value="" disabled>
              サーバを選択してください
            </option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">テンプレート</legend>
          <select
            className="select"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
          >
            <option value={-1} disabled>
              テンプレートを選択してください
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">セッション名</legend>
          <input
            type="text"
            className="input"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            required
          />
        </fieldset>
        <div className="card-actions justify-end">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid}
            onClick={handleCreate}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
};
