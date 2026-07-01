import { db } from "@/db";

import type { ResourceStore, SessionCategory, SessionChannel, SessionRole } from "./types";

// db (Dexie) を back に持つ本番 ResourceStore。sessionId スコープの Role/Channel/Category を
// ロードし、add/remove/update は db に永続化しつつローカル配列も更新する。ステップ実行のたびに
// ロードし直す (useSessionRunner が毎回 load する) ため、前ステップの副作用が反映される。
export const loadResourceStore = async (
  sessionId: number,
  guildId: string,
): Promise<ResourceStore> => {
  const [roleRows, channelRows, categoryRows] = await Promise.all([
    db.Role.where("sessionId").equals(sessionId).toArray(),
    db.Channel.where("sessionId").equals(sessionId).toArray(),
    db.Category.where("sessionId").equals(sessionId).toArray(),
  ]);

  const roles: SessionRole[] = roleRows.map((role) => ({ id: role.id, name: role.name }));
  const channels: SessionChannel[] = channelRows.map((channel) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    writerRoleIds: channel.writerRoleIds,
    readerRoleIds: channel.readerRoleIds,
  }));
  const categories: SessionCategory[] = categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return {
    roles,
    channels,
    categories,
    addRole: async (role) => {
      await db.Role.add({ id: role.id, guildId, sessionId, name: role.name });
      roles.push(role);
    },
    removeRole: async (roleId) => {
      await db.Role.delete([roleId, guildId]);
      const index = roles.findIndex((role) => role.id === roleId);
      if (index >= 0) roles.splice(index, 1);
    },
    addCategory: async (category) => {
      await db.Category.add({ id: category.id, sessionId, name: category.name });
      categories.push(category);
    },
    removeCategory: async (categoryId) => {
      await db.Category.delete(categoryId);
      const index = categories.findIndex((category) => category.id === categoryId);
      if (index >= 0) categories.splice(index, 1);
    },
    addChannel: async (channel) => {
      await db.Channel.add({
        id: channel.id,
        sessionId,
        name: channel.name,
        type: channel.type,
        writerRoleIds: channel.writerRoleIds,
        readerRoleIds: channel.readerRoleIds,
      });
      channels.push(channel);
    },
    removeChannel: async (channelId) => {
      await db.Channel.delete(channelId);
      const index = channels.findIndex((channel) => channel.id === channelId);
      if (index >= 0) channels.splice(index, 1);
    },
    updateChannel: async (channelId, patch) => {
      await db.Channel.update(channelId, patch);
      const channel = channels.find((item) => item.id === channelId);
      if (channel !== undefined) Object.assign(channel, patch);
    },
  };
};
