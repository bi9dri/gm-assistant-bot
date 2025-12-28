import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type RESTGetAPICurrentUserGuildsResult,
  type RESTGetAPIUserResult,
  type RESTPostAPIGuildChannelResult,
  type RESTPostAPIGuildRoleResult,
} from "discord-api-types/v10";
import z from "zod";

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
  private readonly token: string;
  private readonly baseUrl = "https://discord.com/api/v10";

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
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

  async getProfile() {
    const user = await this.request<RESTGetAPIUserResult>("GET", "/users/@me");

    return {
      id: user.id,
      name: user.username,
      icon: getUserAvatarUrl(user.id, user.avatar),
    };
  }

  async getGuilds() {
    const guilds = await this.request<RESTGetAPICurrentUserGuildsResult>(
      "GET",
      "/users/@me/guilds",
    );

    return guilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: getGuildIconUrl(g.id, g.icon),
    }));
  }

  async createRole(data: z.infer<typeof createRoleSchema>) {
    const role = await this.request<RESTPostAPIGuildRoleResult>(
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

  async deleteRole(data: z.infer<typeof deleteRoleSchema>) {
    await this.request<void>("DELETE", `/guilds/${data.guildId}/roles/${data.roleId}`);
  }

  async createCategory(data: z.infer<typeof createCategorySchema>) {
    const category = await this.request<RESTPostAPIGuildChannelResult>(
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

  async createChannel(data: z.infer<typeof createChannelSchema>) {
    const channel = await this.request<RESTPostAPIGuildChannelResult>(
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

  async changeChannelPermissions(data: z.infer<typeof changeChannelPermissionsSchema>) {
    await this.request<void>("PATCH", `/channels/${data.channelId}`, {
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

  async deleteChannel(data: z.infer<typeof deleteChannelSchema>) {
    await this.request<void>("DELETE", `/channels/${data.channelId}`);
  }
}
