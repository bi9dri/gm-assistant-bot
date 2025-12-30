import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTGetAPIUserResult,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleResult,
} from "discord-api-types/v10";

import type {
  ChangeChannelPermissionsData,
  CreateCategoryData,
  CreateChannelData,
  CreateRoleData,
  DeleteChannelData,
  DeleteRoleData,
} from "./schemas";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * guild.idをハッシュ化してデフォルトアバターインデックス(0-5)を決定
 * 同じguildは常に同じアバターを返す
 */
function getDefaultAvatarIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 6;
}

/**
 * guild.iconがnull/undefinedの場合、デフォルトアバターURLを返す
 */
function getGuildIconUrl(guildId: string, iconHash: string | null): string {
  if (!iconHash) {
    const avatarIndex = getDefaultAvatarIndex(guildId);
    return `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
  }
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.webp`;
}

/**
 * user.avatarがnull/undefinedの場合、デフォルトアバターURLを返す
 */
function getUserAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    const avatarIndex = getDefaultAvatarIndex(userId);
    return `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp`;
}

const allPermission = Object.entries(PermissionFlagsBits)
  .filter(([key]) => key !== "Administrator")
  .reduce((acc, [, value]) => acc | value, 0n);

const readerPermission =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak |
  PermissionFlagsBits.UseVAD |
  PermissionFlagsBits.BypassSlowmode;

const writerPermission =
  PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.Stream |
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.SendTTSMessages |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.MentionEveryone |
  PermissionFlagsBits.UseExternalEmojis |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak |
  PermissionFlagsBits.UseVAD |
  PermissionFlagsBits.ManageThreads |
  PermissionFlagsBits.CreatePublicThreads |
  PermissionFlagsBits.SendMessagesInThreads |
  PermissionFlagsBits.SendVoiceMessages |
  PermissionFlagsBits.PinMessages |
  PermissionFlagsBits.BypassSlowmode;

async function discordRequest<T>(
  token: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorData = (await response.json()) as { message?: string };
      if (errorData.message) {
        errorMessage += `: ${errorData.message}`;
      }
    } catch {}
    throw new Error(`Discord API Error: ${errorMessage}`);
  }

  if (response.status === 204 || method === "DELETE") {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getProfile(token: string) {
  const user = await discordRequest<RESTGetAPIUserResult>(token, "GET", "/users/@me");
  return {
    id: user.id,
    name: user.username,
    icon: getUserAvatarUrl(user.id, user.avatar),
  };
}

export async function getGuilds(token: string) {
  const guilds = await discordRequest<RESTGetAPICurrentUserGuildsResult>(
    token,
    "GET",
    "/users/@me/guilds",
  );
  return guilds.map((g) => ({
    id: g.id,
    name: g.name,
    icon: getGuildIconUrl(g.id, g.icon),
  }));
}

export async function createRole(token: string, data: CreateRoleData) {
  const role = await discordRequest<RESTPostAPIGuildRoleResult>(
    token,
    "POST",
    `/guilds/${data.guildId}/roles`,
    {
      name: data.name,
      mentionable: true,
    },
  );
  return {
    id: role.id.toString(),
    name: role.name || "",
  };
}

export async function deleteRole(token: string, data: DeleteRoleData) {
  await discordRequest<void>(token, "DELETE", `/guilds/${data.guildId}/roles/${data.roleId}`);
}

export async function createCategory(token: string, data: CreateCategoryData) {
  const category = await discordRequest<RESTPostAPIGuildChannelResult>(
    token,
    "POST",
    `/guilds/${data.guildId}/channels`,
    {
      type: ChannelType.GuildCategory,
      name: data.name,
      permission_overwrites: [
        {
          id: data.guildId,
          type: OverwriteType.Role,
          deny: allPermission.toString(),
        },
      ],
    },
  );
  return {
    id: category.id,
    name: category.name || "",
  };
}

export async function createChannel(token: string, data: CreateChannelData) {
  const channel = await discordRequest<RESTPostAPIGuildChannelResult>(
    token,
    "POST",
    `/guilds/${data.guildId}/channels`,
    {
      type: data.type === "text" ? ChannelType.GuildText : ChannelType.GuildVoice,
      name: data.name,
      parent_id: data.parentCategoryId,
      permission_overwrites: [
        ...data.writerRoleIds.map((r) => ({
          id: r,
          type: OverwriteType.Role,
          allow: writerPermission.toString(),
        })),
        ...data.readerRoleIds.map((r) => ({
          id: r,
          type: OverwriteType.Role,
          allow: readerPermission.toString(),
        })),
      ],
    },
  );
  return {
    id: channel.id,
    name: channel.name || "",
  };
}

export async function changeChannelPermissions(token: string, data: ChangeChannelPermissionsData) {
  await discordRequest<void>(token, "PATCH", `/channels/${data.channelId}`, {
    permission_overwrites: [
      ...data.writerRoleIds.map((r) => ({
        id: r,
        type: OverwriteType.Role,
        allow: writerPermission.toString(),
      })),
      ...data.readerRoleIds.map((r) => ({
        id: r,
        type: OverwriteType.Role,
        allow: readerPermission.toString(),
      })),
    ],
  });
}

export async function deleteChannel(token: string, data: DeleteChannelData) {
  await discordRequest<void>(token, "DELETE", `/channels/${data.channelId}`);
}
