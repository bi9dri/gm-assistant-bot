import { useLiveQuery } from "dexie-react-hooks";
import { type MouseEvent, useEffect, useState } from "react";
import type z from "zod";

import { ApiClient } from "@/api";
import { db, type ReactFlowData } from "@/db";
import { type GuildSchema } from "@/db";
import { FileSystem, convertFilePathsInReactFlowData } from "@/fileSystem";
import { convertFilePathsInFlowData } from "@/flow/filePaths";
import type { FlowData } from "@/flow/schema";
import { convertFilePathsInScenarioData } from "@/scenario/filePaths";
import { toScenarioDataV2 } from "@/scenario/migrate";
import type { ScenarioData } from "@/scenario/schema";
import { useToast } from "@/toast/ToastProvider";

interface Props {
  onCreate?: (created: {}) => Promise<void>;
  onCancel?: () => void;
}

export const CreateSession = ({ onCreate, onCancel }: Props) => {
  const bots = useLiveQuery(() => db.DiscordBot.toArray(), []);
  const templates = useLiveQuery(() => db.Template.toArray(), []);
  const { addToast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState("");
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(false);
  const [guilds, setGuilds] = useState<z.infer<typeof GuildSchema>[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(-1);
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    if (!selectedBotId) {
      setGuilds([]);
      return;
    }

    void (async () => {
      try {
        setIsLoadingGuilds(true);

        const bot = await db.DiscordBot.get(selectedBotId);
        if (!bot) {
          addToast({ message: "Botが見つかりません", status: "error" });
          setGuilds([]);
          return;
        }
        const client = new ApiClient(bot.token);
        const fetchedGuilds = await client.getGuilds();
        setGuilds(fetchedGuilds);
        setIsLoadingGuilds(false);
      } catch (error) {
        addToast({
          message: error instanceof Error ? error.message : "Guildの取得に失敗しました",
          status: "error",
        });
        setGuilds([]);
      }
    })();
  }, [selectedBotId, addToast]);

  const handleCreate = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      const template = await db.Template.get(selectedTemplateId);
      if (!template) {
        addToast({
          message: "テンプレートの取得に失敗しました",
          status: "error",
        });
        return;
      }

      const existingGuild = await db.Guild.get(selectedGuildId);
      if (!existingGuild) {
        const selectedGuild = guilds.find((g) => g.id === selectedGuildId);
        if (selectedGuild) {
          await db.Guild.add(selectedGuild);
        }
      }

      const newSessionId = await db.GameSession.add({
        name: sessionName,
        guildId: selectedGuildId,
        botId: selectedBotId,
        gameFlags: template.gameFlags,
        // reactFlowData / flowData / scenarioData ともパスは下の update で session/{id}/ へ書き換える
        reactFlowData: template.reactFlowData,
        flowData: template.flowData,
        scenarioData: template.scenarioData,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });

      // Copy files from template to session and update file paths
      const fileSystem = new FileSystem();
      await fileSystem.copyTemplateFilesToSession(selectedTemplateId, newSessionId);

      // reactFlowData / flowData / scenarioData はファイルパスを共有するため、同じ replacer で書き換える
      const replaceFilePath = (filePath: string) =>
        filePath.replace(`template/${selectedTemplateId}/`, `session/${newSessionId}/`);
      const parsed: ReactFlowData = JSON.parse(template.reactFlowData);
      const convertedReactFlowData = JSON.stringify(
        convertFilePathsInReactFlowData(parsed, replaceFilePath),
      );
      const parsedFlow: FlowData = JSON.parse(template.flowData);
      const convertedFlowData = JSON.stringify(
        convertFilePathsInFlowData(parsedFlow, replaceFilePath),
      );
      // Dexie v10 で全行が v2 になっているが、テンプレートは取り込み経路でも増えるため
      // ここでも形を揃えてから触る (v1 のまま渡すと steps が無く落ちる)。
      const parsedScenario = toScenarioDataV2(JSON.parse(template.scenarioData)) as ScenarioData;
      const convertedScenarioData = JSON.stringify(
        convertFilePathsInScenarioData(parsedScenario, replaceFilePath),
      );
      await db.GameSession.update(newSessionId, {
        reactFlowData: convertedReactFlowData,
        flowData: convertedFlowData,
        scenarioData: convertedScenarioData,
      });

      addToast({
        message: `セッション「${sessionName}」を作成しました。`,
        status: "success",
        durationSeconds: 5,
      });

      if (onCreate) {
        await onCreate({ id: newSessionId });
      }
    } catch (error) {
      if (error instanceof Error) {
        addToast({
          message: error.message,
          status: "error",
        });
        return;
      }
      addToast({
        message: "セッションの作成に失敗しました",
        status: "error",
      });
    }
  };

  const valid =
    selectedBotId !== "" &&
    selectedGuildId !== "" &&
    selectedTemplateId !== -1 &&
    sessionName.trim().length > 0;

  return (
    <div className="card lg:w-120 w-full bg-base-200 rounded-xs border-2 border-secondary shadow-md">
      <div className="card-body">
        <h2 className="text-xl">新しいセッションを作成する</h2>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Discord Bot</legend>
          <select
            className="select"
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            disabled={bots?.length === 0}
          >
            <option value="" disabled>
              Botを選択してください
            </option>
            {bots?.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Discordサーバ</legend>
          {isLoadingGuilds ? (
            <div className="skeleton h-12 w-full"></div>
          ) : (
            <select
              className="select"
              value={selectedGuildId}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              disabled={!selectedBotId || guilds.length === 0}
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
          )}
        </fieldset>
        {selectedGuildId && guilds.find((g) => g.id === selectedGuildId) && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-base-300 rounded">
            <img
              src={guilds.find((g) => g.id === selectedGuildId)?.icon}
              alt="Guild icon"
              className="w-8 h-8 rounded"
            />
            <span>{guilds.find((g) => g.id === selectedGuildId)?.name}</span>
          </div>
        )}
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
            {templates?.map((t) => (
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
          {onCancel && (
            <button type="button" className="btn" onClick={onCancel}>
              キャンセル
            </button>
          )}
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
