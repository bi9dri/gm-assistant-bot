import { ApiClient } from "@/api";
import type { DiscordBotData } from "@/db";
import { FileSystem } from "@/fileSystem";

import type { DiscordGateway } from "./types";

export const createDiscordGateway = (bot: DiscordBotData, guildId: string): DiscordGateway => {
  const client = new ApiClient(bot.token);
  const fs = new FileSystem();

  return {
    createRole: (name) => client.createRole({ guildId, name }),
    deleteRole: (roleId) => client.deleteRole({ guildId, roleId }),
    createCategory: (name) => client.createCategory({ guildId, name }),
    createChannel: (params) => client.createChannel({ guildId, ...params }),
    changeChannelPermissions: (params) => client.changeChannelPermissions({ guildId, ...params }),
    deleteChannel: (channelId) => client.deleteChannel({ guildId, channelId }),
    addRoleToRoleMembers: (params) => client.addRoleToRoleMembers({ guildId, ...params }),
    sendMessage: async ({ channelId, content, attachments }) => {
      const files: File[] = [];
      for (const attachment of attachments) {
        files.push(await fs.readFile(attachment.filePath));
      }
      await client.sendMessage({
        channelId,
        content,
        files: files.length > 0 ? files : undefined,
      });
    },
  };
};
