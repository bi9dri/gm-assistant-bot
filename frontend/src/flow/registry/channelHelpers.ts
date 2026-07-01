import type { DiscordGateway, SessionChannel, SessionRole } from "../engine/types";

// CreateChannel / ChangeChannelPermission / SendMessage / CombinationSendMessage が共有する
// チャンネル・ロール解決とメッセージ送信のヘルパ。

interface RolePermission {
  roleName: string;
  canWrite: boolean;
}

// rolePermissions のロール名を id 解決し、書き込み/読み取りロール id に振り分ける。
// 見つからないロール名は missing に集約する (呼び出し側がエラーにする)。
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

// チャンネル名の大小無視一致で SessionChannel を引く。
export const findChannelByName = (
  channels: SessionChannel[],
  name: string,
): SessionChannel | undefined =>
  channels.find((channel) => channel.name.toLowerCase() === name.toLowerCase());

interface SendableMessage {
  content: string;
  attachments: { filePath: string; fileName: string }[];
}

// メッセージブロック列を 1 チャンネルへ送る。content 空 & 添付なしのブロックはスキップ。
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
