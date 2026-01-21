import { REST, type RawFile } from "@discordjs/rest";
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
  type RESTGetAPIGuildMemberResult,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTGetAPIUserResult,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleResult,
} from "discord-api-types/v10";

import type {
  AddRoleToRoleMembersData,
  ChangeChannelPermissionsData,
  CreateCategoryData,
  CreateChannelData,
  CreateRoleData,
  DeleteChannelData,
  DeleteRoleData,
  SendMessageData,
} from "./schemas";

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

function createRestClient(token: string): REST {
  return new REST({ version: "10" }).setToken(token);
}

export async function getProfile(token: string) {
  const rest = createRestClient(token);
  const user = (await rest.get(Routes.user())) as RESTGetAPIUserResult;
  return {
    id: user.id,
    name: user.username,
    icon: getUserAvatarUrl(user.id, user.avatar),
  };
}

export async function getGuilds(token: string) {
  const rest = createRestClient(token);
  const guilds = (await rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
  return guilds.map((g) => ({
    id: g.id,
    name: g.name,
    icon: getGuildIconUrl(g.id, g.icon),
  }));
}

export async function createRole(token: string, data: CreateRoleData) {
  const rest = createRestClient(token);
  const role = (await rest.post(Routes.guildRoles(data.guildId), {
    body: {
      name: data.name,
      mentionable: true,
    },
  })) as RESTPostAPIGuildRoleResult;
  return {
    id: role.id.toString(),
    name: role.name || "",
  };
}

export async function deleteRole(token: string, data: DeleteRoleData) {
  const rest = createRestClient(token);
  await rest.delete(Routes.guildRole(data.guildId, data.roleId));
}

export async function createCategory(token: string, data: CreateCategoryData) {
  const rest = createRestClient(token);
  const category = (await rest.post(Routes.guildChannels(data.guildId), {
    body: {
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
  })) as RESTPostAPIGuildChannelResult;
  return {
    id: category.id,
    name: category.name || "",
  };
}

export async function createChannel(token: string, data: CreateChannelData) {
  const rest = createRestClient(token);
  const channel = (await rest.post(Routes.guildChannels(data.guildId), {
    body: {
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
  })) as RESTPostAPIGuildChannelResult;
  return {
    id: channel.id,
    name: channel.name || "",
  };
}

export async function changeChannelPermissions(token: string, data: ChangeChannelPermissionsData) {
  const rest = createRestClient(token);
  await rest.patch(Routes.channel(data.channelId), {
    body: {
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
  });
}

export async function deleteChannel(token: string, data: DeleteChannelData) {
  const rest = createRestClient(token);
  await rest.delete(Routes.channel(data.channelId));
}

export async function addRoleToRoleMembers(token: string, data: AddRoleToRoleMembersData) {
  const rest = createRestClient(token);

  // 指定されたロールを持つメンバーを取得
  const membersWithRole = [];
  let after: string | undefined = undefined;
  while (true) {
    const query = new URLSearchParams();
    query.append("limit", "1000");
    if (after) {
      query.append("after", after);
    }
    const members = (await rest.get(Routes.guildMembers(data.guildId), {
      query,
    })) as RESTGetAPIGuildMemberResult[];
    if (members.length === 0) break;
    for (const member of members) {
      if (member.roles.includes(data.memberRoleId)) {
        membersWithRole.push(member.user.id);
      }
    }
    after = members[members.length - 1].user.id;
  }

  // メンバーにロールを追加
  for (const memberId of membersWithRole) {
    await rest.put(Routes.guildMemberRole(data.guildId, memberId, data.addRoleId));
  }
}

export async function sendMessage(token: string, data: SendMessageData) {
  const rest = createRestClient(token);

  const filesArray = data.files ? (Array.isArray(data.files) ? data.files : [data.files]) : [];

  const rawFiles = await Promise.all(filesArray.map((file) => fileToRawFile(file)));

  await rest.post(Routes.channelMessages(data.channelId), {
    body: {
      content: data.content,
    },
    files: rawFiles.length > 0 ? rawFiles : undefined,
  });
}

async function fileToRawFile(file: File): Promise<RawFile> {
  return {
    contentType: file.type,
    data: await file.bytes(),
    name: file.name,
  };
}
