import type { DiscordGateway, SessionChannel, SessionRole } from "../engine/types";

interface RolePermission {
  roleName: string;
  canWrite: boolean;
}

export const resolveRolePermissions = (
  roles: SessionRole[],
  permissions: RolePermission[],
): { writerRoleIds: string[]; readerRoleIds: string[]; missing: string[] } => {
  const roleNameToId = new Map(roles.map((role) => [role.name, role.id]));
  const missing = [
    ...new Set(
      permissions
        .map((perm) => perm.roleName.trim())
        .filter((name) => name !== "" && !roleNameToId.has(name)),
    ),
  ];
  const writerRoleIds: string[] = [];
  const readerRoleIds: string[] = [];
  for (const perm of permissions) {
    const roleName = perm.roleName.trim();
    if (roleName === "") continue;
    const roleId = roleNameToId.get(roleName);
    if (roleId === undefined) continue;
    (perm.canWrite ? writerRoleIds : readerRoleIds).push(roleId);
  }
  return { writerRoleIds, readerRoleIds, missing };
};

export const findChannelByName = (
  channels: SessionChannel[],
  name: string,
): SessionChannel | undefined =>
  channels.find((channel) => channel.name.toLowerCase() === name.toLowerCase());

interface SendableMessage {
  content: string;
  attachments: { filePath: string; fileName: string }[];
}

export const sendMessageBlocks = async (
  discord: DiscordGateway,
  channelId: string,
  messages: SendableMessage[],
): Promise<void> => {
  for (const message of messages) {
    if (message.content.trim() === "" && message.attachments.length === 0) continue;
    await discord.sendMessage({
      channelId,
      content: message.content,
      attachments: message.attachments.map((attachment) => ({
        filePath: attachment.filePath,
        fileName: attachment.fileName,
      })),
    });
  }
};
