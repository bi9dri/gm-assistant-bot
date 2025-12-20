import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
  type RESTAPIGuildCreateRole,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTPatchAPIChannelJSONBody,
  type RESTPostAPIGuildChannelJSONBody,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleJSONBody,
} from "discord-api-types/v10";
import { REST } from "discord.js";
import type {
  CreateRoleData,
  CreateCategoryData,
  CreateChannelData,
  ChangeChannelPermissionsData,
  DeleteRoleData,
  DeleteChannelData,
} from "./schemas";

// Channel-specific permissions (Text & Voice channels)
const channelPermissions =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.ManageChannels |
  PermissionFlagsBits.ManageWebhooks |
  PermissionFlagsBits.CreateInstantInvite |
  // Text channel permissions
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.SendMessagesInThreads |
  PermissionFlagsBits.CreatePublicThreads |
  PermissionFlagsBits.CreatePrivateThreads |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.UseExternalEmojis |
  PermissionFlagsBits.UseExternalStickers |
  PermissionFlagsBits.MentionEveryone |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.ManageThreads |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.SendTTSMessages |
  PermissionFlagsBits.SendVoiceMessages |
  PermissionFlagsBits.PinMessages |
  PermissionFlagsBits.UseApplicationCommands |
  PermissionFlagsBits.BypassSlowmode |
  // Voice channel permissions
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak |
  PermissionFlagsBits.Stream |
  PermissionFlagsBits.UseEmbeddedActivities |
  PermissionFlagsBits.UseSoundboard |
  PermissionFlagsBits.UseExternalSounds |
  PermissionFlagsBits.UseVAD |
  PermissionFlagsBits.PrioritySpeaker |
  PermissionFlagsBits.MuteMembers |
  PermissionFlagsBits.DeafenMembers |
  PermissionFlagsBits.MoveMembers |
  PermissionFlagsBits.RequestToSpeak |
  PermissionFlagsBits.ManageEvents;

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

console.log("Discord bot token:", process.env.DISCORD_BOT_TOKEN!.slice(0, 4) + "****");
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);

export const getGuilds = async () => {
  const guilds = (await rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
  return guilds.map((g) => ({
    id: g.id,
    name: g.name,
    icon: `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.avif`,
  }));
};

export const createCategory = async (data: CreateCategoryData) => {
  const category = (await rest.post(Routes.guildChannels(data.guildId), {
    body: {
      guild_id: data.guildId,
      type: ChannelType.GuildCategory,
      name: data.name,
      permission_overwrites: [
        {
          // @everyone role
          id: data.guildId,
          type: OverwriteType.Role,
          deny: channelPermissions.toString(),
        },
      ],
    } as RESTPostAPIGuildChannelJSONBody,
  })) as RESTPostAPIGuildChannelResult;
  return {
    id: category.id,
    name: category.name,
  };
};

export const createChannel = async (data: CreateChannelData) => {
  const channel = (await rest.post(Routes.guildChannels(data.guildId), {
    body: {
      guild_id: data.guildId,
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
    } as RESTPostAPIGuildChannelJSONBody,
  })) as RESTPostAPIGuildChannelResult;
  return {
    id: channel.id,
    name: channel.name,
  };
};

export const deleteChannel = async (data: DeleteChannelData) => {
  await rest.delete(Routes.channel(data.channelId));
};

export const changeChannelPermissions = async (data: ChangeChannelPermissionsData) => {
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
    } as RESTPatchAPIChannelJSONBody,
  });
};

export const createRole = async (data: CreateRoleData) => {
  const role = (await rest.post(Routes.guildRoles(data.guildId), {
    body: {
      name: data.name,
      mentionable: true,
    } as RESTPostAPIGuildRoleJSONBody,
  })) as RESTAPIGuildCreateRole;
  return {
    id: role.id,
    name: role.name,
  };
};

export const deleteRole = async (data: DeleteRoleData) => {
  await rest.delete(Routes.guildRole(data.guildId, data.roleId));
};
