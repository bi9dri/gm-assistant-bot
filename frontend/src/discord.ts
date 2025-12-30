import z from "zod";

import api, { BOT_TOKEN_HEADER } from "./api";

/**
 * Extract error message from unknown error object.
 * https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
 */
function getErrorMessage(error: unknown, fallback: string | number): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as Record<string, unknown>).error === "string"
  ) {
    return (error as Record<string, unknown>).error as string;
  }
  return String(fallback);
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

export class DiscordClient {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  private headers() {
    return { [BOT_TOKEN_HEADER]: this.token };
  }

  async getProfile() {
    const res = await api.profile.$get({}, { headers: this.headers() });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to get profile: ${getErrorMessage(error, res.status)}`);
    }
    const data = await res.json();
    return data.profile;
  }

  async getGuilds() {
    const res = await api.guilds.$get({}, { headers: this.headers() });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to get guilds: ${getErrorMessage(error, res.status)}`);
    }
    const data = await res.json();
    return data.guilds;
  }

  async createRole(data: z.infer<typeof createRoleSchema>) {
    const res = await api.roles.$post({ json: data }, { headers: this.headers() });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create role: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.role;
  }

  async deleteRole(data: z.infer<typeof deleteRoleSchema>) {
    const res = await api.roles.$delete({ json: data }, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to delete role: ${res.status}`);
    }
  }

  async createCategory(data: z.infer<typeof createCategorySchema>) {
    const res = await api.categories.$post({ json: data }, { headers: this.headers() });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create category: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.category;
  }

  async createChannel(data: z.infer<typeof createChannelSchema>) {
    const res = await api.channels.$post({ json: data }, { headers: this.headers() });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create channel: ${getErrorMessage(error, res.status)}`);
    }
    const result = await res.json();
    return result.channel;
  }

  async changeChannelPermissions(data: z.infer<typeof changeChannelPermissionsSchema>) {
    const res = await api.channels.permissions.$patch({ json: data }, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to change channel permissions: ${res.status}`);
    }
  }

  async deleteChannel(data: z.infer<typeof deleteChannelSchema>) {
    const res = await api.channels.$delete({ json: data }, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to delete channel: ${res.status}`);
    }
  }
}
