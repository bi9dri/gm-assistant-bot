import { DiscordAPIError, REST, type RawFile } from "@discordjs/rest";
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
  type APIReaction,
  type RESTGetAPIChannelMessageResult,
  type RESTGetAPIGuildMemberResult,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTGetAPIUserResult,
  type RESTPostAPIChannelMessageResult,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleResult,
} from "discord-api-types/v10";

import type {
  AddRoleToMemberData,
  AddRoleToRoleMembersData,
  ChangeChannelPermissionsData,
  CreateCategoryData,
  CreateChannelData,
  CreateRoleData,
  DeleteChannelData,
  DeleteRoleData,
  GetVoteResultData,
  ListGuildMembersData,
  SendMessageData,
  SendVoteData,
} from "./schemas";

/**
 * guild.idをハッシュ化してデフォルトアバターインデックス(0-5)を決定
 * 同じguildは常に同じアバターを返す
 */
export function getDefaultAvatarIndex(id: string): number {
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
export function getGuildIconUrl(guildId: string, iconHash: string | null): string {
  if (!iconHash) {
    const avatarIndex = getDefaultAvatarIndex(guildId);
    return `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
  }
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.webp`;
}

/**
 * user.avatarがnull/undefinedの場合、デフォルトアバターURLを返す
 */
export function getUserAvatarUrl(userId: string, avatarHash: string | null): string {
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
      name: data.name.toLowerCase(),
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
      name: data.name.toLowerCase(),
      parent_id: data.parentCategoryId,
      permission_overwrites: [
        {
          id: data.guildId,
          type: OverwriteType.Role,
          deny: allPermission.toString(),
        },
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
        {
          id: data.guildId,
          type: OverwriteType.Role,
          deny: allPermission.toString(),
        },
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

// ギルドメンバーを 1000 件ずつ全ページ取得する。
// Server Members Intent が無効だと 50001 になり、エラー文だけでは原因が分からないため補足する。
async function fetchGuildMembers(
  rest: REST,
  guildId: string,
): Promise<RESTGetAPIGuildMemberResult[]> {
  const all: RESTGetAPIGuildMemberResult[] = [];
  let after: string | undefined = undefined;
  while (true) {
    const query = new URLSearchParams();
    query.append("limit", "1000");
    if (after) {
      query.append("after", after);
    }
    let members: RESTGetAPIGuildMemberResult[];
    try {
      members = (await rest.get(Routes.guildMembers(guildId), {
        query,
      })) as RESTGetAPIGuildMemberResult[];
    } catch (e) {
      if (e instanceof DiscordAPIError && e.code === 50001) {
        throw new Error(
          "ギルドメンバーの取得に失敗しました。Discord Developer Portal で「Server Members Intent」を有効にしてください",
        );
      }
      throw e;
    }
    if (members.length === 0) break;
    all.push(...members);
    after = members[members.length - 1].user.id;
  }
  return all;
}

/**
 * サーバー内での表示名。ニックネーム > 表示名 > ユーザー名の順で拾う
 */
export function getMemberDisplayName(member: RESTGetAPIGuildMemberResult): string {
  return member.nick || member.user.global_name || member.user.username;
}

export async function listGuildMembers(token: string, data: ListGuildMembersData) {
  const rest = createRestClient(token);
  const members = await fetchGuildMembers(rest, data.guildId);
  return members
    .filter((member) => !member.user.bot)
    .map((member) => ({ id: member.user.id, name: getMemberDisplayName(member) }));
}

export async function addRoleToMember(token: string, data: AddRoleToMemberData) {
  const rest = createRestClient(token);
  await rest.put(Routes.guildMemberRole(data.guildId, data.userId, data.roleId));
}

export async function addRoleToRoleMembers(token: string, data: AddRoleToRoleMembersData) {
  const rest = createRestClient(token);

  const members = await fetchGuildMembers(rest, data.guildId);
  const membersWithRole = members
    .filter((member) => member.roles.includes(data.memberRoleId))
    .map((member) => member.user.id);

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
      content: data.content || undefined,
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

export async function sendVote(token: string, data: SendVoteData) {
  const rest = createRestClient(token);
  const message = (await rest.post(Routes.channelMessages(data.channelId), {
    body: { content: data.content },
  })) as RESTPostAPIChannelMessageResult;

  for (const emoji of data.optionEmojis) {
    await rest.put(
      Routes.channelMessageOwnReaction(data.channelId, message.id, encodeURIComponent(emoji)),
    );
  }
  return { id: message.id };
}

/**
 * リアクションを絵文字ごとの票数に変換する。
 * bot 自身が選択肢として付けた 1 票 (me) は投票ではないため差し引く
 */
export function toVoteCounts(reactions: APIReaction[] | undefined) {
  return (reactions ?? []).map((reaction) => ({
    emoji: reaction.emoji.name ?? "",
    count: Math.max(0, reaction.count - (reaction.me ? 1 : 0)),
  }));
}

export async function getVoteResult(token: string, data: GetVoteResultData) {
  const rest = createRestClient(token);
  const message = (await rest.get(
    Routes.channelMessage(data.channelId, data.messageId),
  )) as RESTGetAPIChannelMessageResult;
  return toVoteCounts(message.reactions);
}
