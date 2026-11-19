export interface SessionRole {
  id: string;
  name: string;
}

export interface SessionChannel {
  id: string;
  name: string;
  type: "text" | "voice";
  writerRoleIds: string[];
  readerRoleIds: string[];
}

export interface SessionCategory {
  id: string;
  name: string;
}

interface OutgoingAttachment {
  filePath: string;
  fileName: string;
}

interface OutgoingMessage {
  channelId: string;
  content: string;
  attachments: OutgoingAttachment[];
}

export interface DiscordGateway {
  createRole(name: string): Promise<{ id: string; name: string }>;
  deleteRole(roleId: string): Promise<void>;
  createCategory(name: string): Promise<{ id: string; name: string }>;
  createChannel(params: {
    parentCategoryId: string;
    name: string;
    type: "text" | "voice";
    writerRoleIds: string[];
    readerRoleIds: string[];
  }): Promise<{ id: string; name: string }>;
  changeChannelPermissions(params: {
    channelId: string;
    writerRoleIds: string[];
    readerRoleIds: string[];
  }): Promise<void>;
  deleteChannel(channelId: string): Promise<void>;
  addRoleToRoleMembers(params: { memberRoleId: string; addRoleId: string }): Promise<void>;
  sendMessage(message: OutgoingMessage): Promise<void>;
}

export interface ResourceStore {
  readonly roles: SessionRole[];
  readonly channels: SessionChannel[];
  readonly categories: SessionCategory[];
  addRole(role: SessionRole): Promise<void>;
  removeRole(roleId: string): Promise<void>;
  addCategory(category: SessionCategory): Promise<void>;
  removeCategory(categoryId: string): Promise<void>;
  addChannel(channel: SessionChannel): Promise<void>;
  removeChannel(channelId: string): Promise<void>;
  updateChannel(
    channelId: string,
    patch: Partial<Pick<SessionChannel, "writerRoleIds" | "readerRoleIds">>,
  ): Promise<void>;
}

interface FlagStore {
  get(): Record<string, string>;
  set(patch: Record<string, string>): Promise<void>;
}

export interface ExecuteContext {
  guildId: string;
  sessionId: number;
  sessionName: string;
  discord: DiscordGateway;
  resources: ResourceStore;
  flags: FlagStore;
  branchChoice?: string;
}

export interface ExecuteResult {
  status: "success" | "error";
  message: string;
  branchArmIds?: string[];
}
