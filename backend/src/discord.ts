import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
  type RESTAPIGuildCreateRole,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTGetAPIGuildChannelsResult,
  type RESTPatchAPIChannelJSONBody,
  type RESTPostAPIGuildChannelJSONBody,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleJSONBody,
} from "discord-api-types/v10";
import { REST } from "discord.js";

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

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);

export const getGuilds = async () => {
  const guilds = (await rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
  return guilds.map((g) => ({
    id: g.id,
    name: g.name,
    icon: `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.avif`,
  }));
};

export const getCategory = async (guildId: string, categoryId: string) => {
  const allChannels = (await rest.get(
    Routes.guildChannels(guildId),
  )) as RESTGetAPIGuildChannelsResult;
  const category = allChannels.find(
    (c) => c.id === categoryId && c.type === ChannelType.GuildCategory,
  );
  if (!category) {
    throw new Error("Category not found");
  }
  const categoryChannels = allChannels.filter((c) => c.parent_id === categoryId);
  return {
    id: category.id,
    name: category.name,
    textChannels: categoryChannels
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => ({ id: c.id, name: c.name })),
    voiceChannels: categoryChannels
      .filter((c) => c.type === ChannelType.GuildVoice)
      .map((c) => ({ id: c.id, name: c.name })),
  };
};

export const createCategory = async (guildId: string, name: string) => {
  const category = (await rest.post(Routes.guildChannels(guildId), {
    body: {
      guild_id: guildId,
      type: ChannelType.GuildCategory,
      name,
      permission_overwrites: [
        {
          // @everyone role
          id: guildId,
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

export const createChannel = async (
  guildId: string,
  parentCategoryId: string,
  name: string,
  type: "text" | "voice" = "text",
  writerRoleIds: string[],
  readerRoleIds: string[],
) => {
  const channel = (await rest.post(Routes.guildChannels(guildId), {
    body: {
      guild_id: guildId,
      type: type === "text" ? ChannelType.GuildText : ChannelType.GuildVoice,
      name,
      parent_id: parentCategoryId,
      permission_overwrites: [
        ...writerRoleIds.map((r) => ({
          id: r,
          type: OverwriteType.Role,
          allow: writerPermission.toString(),
        })),
        ...readerRoleIds.map((r) => ({
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

export const deleteChannel = async (channelId: string) => {
  await rest.delete(Routes.channel(channelId));
};

export const changeChannelPermissions = async (
  channelId: string,
  writerRoleIds: string[],
  readerRoleIds: string[],
) => {
  await rest.patch(Routes.channel(channelId), {
    body: {
      permission_overwrites: [
        ...writerRoleIds.map((r) => ({
          id: r,
          type: OverwriteType.Role,
          allow: writerPermission.toString(),
        })),
        ...readerRoleIds.map((r) => ({
          id: r,
          type: OverwriteType.Role,
          allow: readerPermission.toString(),
        })),
      ],
    } as RESTPatchAPIChannelJSONBody,
  });
};

export const createRole = async (guildId: string, name: string) => {
  const role = (await rest.post(Routes.guildRoles(guildId), {
    body: {
      name,
      mentionable: true,
    } as RESTPostAPIGuildRoleJSONBody,
  })) as RESTAPIGuildCreateRole;
  return {
    id: role.id,
    name: role.name,
  };
};

export const deleteRole = async (guildId: string, roleId: string) => {
  await rest.delete(Routes.guildRole(guildId, roleId));
};
