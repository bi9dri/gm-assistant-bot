import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  REST,
  Routes,
  type RESTAPIGuildCreateRole,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTGetAPIUserResult,
  type RESTPatchAPIChannelJSONBody,
  type RESTPostAPIGuildChannelJSONBody,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleJSONBody,
} from "discord.js";
import z from "zod";

export const createRoleSchema = z.object({
  guildId: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
});

export const deleteRoleSchema = z.object({
  guildId: z.string().nonempty().trim(),
  roleId: z.string().nonempty().trim(),
});

export const createCategorySchema = z.object({
  guildId: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
});

export const createChannelSchema = z.object({
  guildId: z.string().nonempty().trim(),
  parentCategoryId: z.string().nonempty().trim(),
  name: z.string().nonempty().trim(),
  type: z.enum(["text", "voice"]),
  writerRoleIds: z.array(z.string().nonempty().trim()),
  readerRoleIds: z.array(z.string().nonempty().trim()),
});

export const changeChannelPermissionsSchema = z.object({
  channelId: z.string().nonempty().trim(),
  writerRoleIds: z.array(z.string().nonempty().trim()),
  readerRoleIds: z.array(z.string().nonempty().trim()),
});

export const deleteChannelSchema = z.object({
  guildId: z.string().nonempty().trim(),
  channelId: z.string().nonempty().trim(),
});

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

export class DiscordClient {
  private readonly rest: REST;

  constructor(token: string) {
    this.rest = new REST({ version: "10" }).setToken(token);
  }

  async getProfile() {
    const user = (await this.rest.get(Routes.user("@me"))) as RESTGetAPIUserResult;
    return {
      id: user.id,
      name: user.username,
      icon: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`,
    };
  }

  async getGuilds() {
    const guilds = (await this.rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
    return guilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp`,
    }));
  }

  async createRole(data: z.infer<typeof createRoleSchema>) {
    const role = (await this.rest.post(Routes.guildRoles(data.guildId), {
      body: {
        name: data.name,
        mentionable: true,
      } as RESTPostAPIGuildRoleJSONBody,
    })) as RESTAPIGuildCreateRole;

    return {
      id: role.id.toString(),
      name: role.name || "",
    };
  }

  async deleteRole(data: z.infer<typeof deleteRoleSchema>) {
    await this.rest.delete(Routes.guildRole(data.guildId, data.roleId));
  }

  async createCategory(data: z.infer<typeof createCategorySchema>) {
    const category = (await this.rest.post(Routes.guildChannels(data.guildId), {
      body: {
        guild_id: data.guildId,
        type: ChannelType.GuildCategory,
        name: data.name,
        permission_overwrites: [
          {
            // @everyone role
            id: data.guildId,
            type: OverwriteType.Role,
            deny: allPermission.toString(),
          },
        ],
      } as RESTPostAPIGuildChannelJSONBody,
    })) as RESTPostAPIGuildChannelResult;

    return {
      id: category.id,
      name: category.name || "",
    };
  }

  async createChannel(data: z.infer<typeof createChannelSchema>) {
    const channel = (await this.rest.post(Routes.guildChannels(data.guildId), {
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
      name: channel.name || "",
    };
  }

  async changeChannelPermissions(data: z.infer<typeof changeChannelPermissionsSchema>) {
    await this.rest.patch(Routes.channel(data.channelId), {
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
  }

  async deleteChannel(data: z.infer<typeof deleteChannelSchema>) {
    await this.rest.delete(Routes.channel(data.channelId));
  }
}

// // Channel-specific permissions (Text & Voice channels)
// const channelPermissions =
//   PermissionFlagsBits.ViewChannel |
//   PermissionFlagsBits.ManageChannels |
//   PermissionFlagsBits.ManageWebhooks |
//   PermissionFlagsBits.CreateInstantInvite |
//   // Text channel permissions
//   PermissionFlagsBits.SendMessages |
//   PermissionFlagsBits.SendMessagesInThreads |
//   PermissionFlagsBits.CreatePublicThreads |
//   PermissionFlagsBits.CreatePrivateThreads |
//   PermissionFlagsBits.EmbedLinks |
//   PermissionFlagsBits.AttachFiles |
//   PermissionFlagsBits.AddReactions |
//   PermissionFlagsBits.UseExternalEmojis |
//   PermissionFlagsBits.UseExternalStickers |
//   PermissionFlagsBits.MentionEveryone |
//   PermissionFlagsBits.ManageMessages |
//   PermissionFlagsBits.ManageThreads |
//   PermissionFlagsBits.ReadMessageHistory |
//   PermissionFlagsBits.SendTTSMessages |
//   PermissionFlagsBits.SendVoiceMessages |
//   PermissionFlagsBits.PinMessages |
//   PermissionFlagsBits.UseApplicationCommands |
//   PermissionFlagsBits.BypassSlowmode |
//   // Voice channel permissions
//   PermissionFlagsBits.Connect |
//   PermissionFlagsBits.Speak |
//   PermissionFlagsBits.Stream |
//   PermissionFlagsBits.UseEmbeddedActivities |
//   PermissionFlagsBits.UseSoundboard |
//   PermissionFlagsBits.UseExternalSounds |
//   PermissionFlagsBits.UseVAD |
//   PermissionFlagsBits.PrioritySpeaker |
//   PermissionFlagsBits.MuteMembers |
//   PermissionFlagsBits.DeafenMembers |
//   PermissionFlagsBits.MoveMembers |
//   PermissionFlagsBits.RequestToSpeak |
//   PermissionFlagsBits.ManageEvents;
