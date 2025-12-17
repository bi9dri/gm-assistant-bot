import { useEffect, useState, type MouseEvent } from "react";
import type { Guild } from "@/types";
import api from "@/api";
import { Template } from "@/models/template";
import { useToast } from "@/toast/ToastProvider";
import { GameSession } from "@/models/gameSession";

export interface PartialGameSession {
  id: number;
  name: string;
  lastUpdatedAt?: Date;
}

interface Props {
  onCreate?: (session: PartialGameSession) => Promise<void>;
}

export const CreateSession = ({ onCreate }: Props) => {
  const { addToast } = useToast();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    void (async () => {
      const gres = await api.guilds.$get();
      if (gres.ok) {
        const data = await gres.json();
        setGuilds(data.guilds);
      }

      const tres = await Template.getAll();
      setTemplates(tres.map((t) => ({ id: t.id!, name: t.name })) || []);
    })();
  }, []);

  const valid =
    selectedGuildId !== "" && selectedTemplateId !== "" && sessionName.trim().length > 0;

  const handleCreate = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const resCategory = await api.categories.$post({
      json: {
        guildId: selectedGuildId,
        name: sessionName,
      },
    });
    if (!resCategory.ok) {
      addToast({
        message: "カテゴリの作成に失敗しました",
        status: "error",
      });
      return;
    }

    const newSession = await GameSession.create(sessionName);
    addToast({
      message: `セッション「${newSession.name}」を作成しました`,
      status: "success",
      durationSeconds: 5,
    });
    if (onCreate) {
      await onCreate(newSession);
    }
  };

  return (
    <div className="card lg:w-160 w-full shadow-md">
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
            <option value="" disabled>
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
          <legend className="fieldset-legend">セッション名 (Discordカテゴリ名)</legend>
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
