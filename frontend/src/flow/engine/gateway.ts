import type { DiscordBotData } from "@/db";

import { ApiClient } from "@/api";
import { FileSystem } from "@/fileSystem";

import type { DiscordGateway } from "./types";

// 本番の DiscordGateway 実装。旧 ApiClient を意味的な操作に薄くラップし、guildId を閉じ込める。
// sendMessage は添付を filePath で受け取り、ここで OPFS から File を読んでから送る
// (execute() 自身は FileSystem に触れず純粋なまま)。
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
