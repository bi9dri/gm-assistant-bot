import { useEffect, useState, type MouseEvent } from "react";
import type { Guild } from "@/types";
import api from "@/api";
import { Template } from "@/models/template";
import { useToast } from "@/toast/ToastProvider";
import { GameSession } from "@/models/gameSession";
import type { InferRequestType } from "hono";

export interface PartialGameSession {
  id: number;
  name: string;
  lastUpdatedAt?: Date;
}

interface Props {
  onCreate: (session: PartialGameSession) => Promise<void>;
}

export const CreateSession = ({ onCreate }: Props) => {
  const { addToast } = useToast();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | undefined>();
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    void (async () => {
      const gres = await api.guilds.$get();
      setGuilds((await gres.json()).guilds);

      const tres = await Template.getAll();
      setTemplates(tres.map((t) => ({ id: t.id!, name: t.name })));
    })();
  }, []);

  const handleCreate = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // const res = await api.roles.$post({
    //   json: {
        
    //   },
    // });

    const newSession = await GameSession.create(sessionName);
    addToast({
      message: `セッション「${newSession.name}」を作成しました`,
      status: "success",
      durationSeconds: 5,
    });
    await onCreate(newSession);
  };

  return (
    <div className="card lg:w-160 w-full shadow-md">
      <div className="card-body">
        <h2 className="text-xl">新しいセッションを作成する</h2>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Discordサーバ</legend>

          <details className="dropdown">
            <summary>
              <GuildSelectItem guild={selectedGuild} />
            </summary>
            <ul className="menu dropdown-content bg-base-100 rounded-box z-1 p-2 shadow-sm">
              {guilds.map((g) => (
                <li key={g.id} onClick={() => setSelectedGuild(g)}>
                  <GuildSelectItem guild={g} />
                </li>
              ))}
            </ul>
          </details>
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
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            作成
          </button>
        </div>
      </div>
    </div>
  );
};

const GuildSelectItem = ({ guild }: { guild?: Guild }) => {
  if (!guild) {
    return <div className="h-3">サーバを選択してください</div>;
  }
  return (
    <div>
      <img src={guild.icon} className="h-3" />
      <span>{guild.name}</span>
    </div>
  );
};
