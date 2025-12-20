import type z from "zod";

import { type MouseEvent, useEffect, useState } from "react";

import type { GuildSchema } from "@/models";

import api from "@/api";
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
      const gres = await api.guilds.$get();
      if (gres.ok) {
        const data = await gres.json();
        setGuilds(data.guilds);
      }

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

    const createdRoles: { [name: string]: string } = {};
    const createdChannels: { id: string; name: string }[] = [];
    const rollback = async () => {
      try {
        for (const r of Object.values(createdRoles)) {
          await api.roles.$delete({
            json: {
              guildId: selectedGuildId,
              roleId: r,
            },
          });
        }
        for (const c of createdChannels) {
          await api.channels.$delete({
            json: {
              guildId: selectedGuildId,
              channelId: c.id,
            },
          });
        }
      } catch (err) {
        console.error("Rollback failed:", err);
        addToast({
          message: "ロールバックに失敗しました。手動でロールとチャンネルを削除してください。",
          status: "error",
        });
      }
    };

    for (const roleName of template.roles) {
      const resRole = await api.roles.$post({
        json: {
          guildId: selectedGuildId,
          name: roleName,
        },
      });
      if (!resRole.ok) {
        addToast({
          message: `ロール「${roleName}」の作成に失敗しました`,
          status: "error",
        });
        await rollback();
        return;
      }
      const roleData = await resRole.json();
      createdRoles[roleName] = roleData.role.id;
      await db.Role.add({
        id: roleData.role.id,
        guildId: selectedGuildId,
        name: roleName,
      });
    }

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
      await rollback();
      return;
    }
    const categoryData = await resCategory.json();
    createdChannels.push({ id: categoryData.category.id, name: sessionName });
    await db.Category.add({
      id: categoryData.category.id,
      name: sessionName,
    });

    const channelDefs = await template.channels;
    for (const channelDef of channelDefs) {
      const resChannel = await api.channels.$post({
        json: {
          guildId: selectedGuildId,
          parentCategoryId: categoryData.category.id,
          name: channelDef.name,
          type: channelDef.type,
          writerRoleIds: channelDef.writerRoles.map((r) => createdRoles[r]),
          readerRoleIds: channelDef.readerRoles.map((r) => createdRoles[r]),
        },
      });
      if (!resChannel.ok) {
        addToast({
          message: `チャンネル「${channelDef.name}」の作成に失敗しました`,
          status: "error",
        });
        await rollback();
        return;
      }
      const channelData = await resChannel.json();
      createdChannels.push({ id: channelData.channel.id, name: channelDef.name });
      await db.Channel.add({
        id: channelData.channel.id,
        name: channelDef.name,
        type: channelDef.type,
        writerRoleIds: channelDef.writerRoles.map((r) => createdRoles[r]),
        readerRoleIds: channelDef.readerRoles.map((r) => createdRoles[r]),
      });
    }

    const newSession = await db.GameSession.add({
      name: sessionName,
      guildId: selectedGuildId,
      categoryId: categoryData.category.id,
      roleIds: Object.values(createdRoles),
      createdAt: new Date(),
    });

    addToast({
      message: `セッション「${sessionName}」を作成しました`,
      status: "success",
      durationSeconds: 5,
    });
    if (onCreate) {
      await onCreate(newSession);
    }
  };

  const valid =
    selectedGuildId !== "" && selectedTemplateId !== -1 && sessionName.trim().length > 0;

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
