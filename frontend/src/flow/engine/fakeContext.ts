import type {
  DiscordGateway,
  ExecuteContext,
  SessionCategory,
  SessionChannel,
  SessionRole,
} from "./types";

// execute() を unit-test するためのインメモリ ExecuteContext。Discord 呼び出しは記録し、
// リソース/フラグはインメモリ配列・オブジェクトを直接更新する。テストは state を検査して
// 副作用を確認し、discord.*.fail に true を積めば失敗経路を再現できる。

interface FakeGatewayCall {
  method: keyof DiscordGateway;
  arg: unknown;
}

interface FakeContextState {
  flags: Record<string, string>;
  roles: SessionRole[];
  channels: SessionChannel[];
  categories: SessionCategory[];
  calls: FakeGatewayCall[];
}

interface FakeContextOptions {
  flags?: Record<string, string>;
  roles?: SessionRole[];
  channels?: SessionChannel[];
  categories?: SessionCategory[];
  sessionName?: string;
  branchChoice?: string;
  // 指定した method を呼んだとき例外を投げる (失敗経路のテスト用)。
  failOn?: Partial<Record<keyof DiscordGateway, boolean>>;
}

export const createFakeContext = (
  options: FakeContextOptions = {},
): { ctx: ExecuteContext; state: FakeContextState } => {
  const state: FakeContextState = {
    flags: { ...options.flags },
    roles: [...(options.roles ?? [])],
    channels: [...(options.channels ?? [])],
    categories: [...(options.categories ?? [])],
    calls: [],
  };

  const record = (method: keyof DiscordGateway, arg: unknown): void => {
    state.calls.push({ method, arg });
    if (options.failOn?.[method]) throw new Error(`fake gateway failure: ${method}`);
  };

  const discord: DiscordGateway = {
    createRole: async (name) => {
      record("createRole", name);
      return { id: `role-${name}`, name };
    },
    deleteRole: async (roleId) => {
      record("deleteRole", roleId);
    },
    createCategory: async (name) => {
      record("createCategory", name);
      return { id: `cat-${name}`, name };
    },
    createChannel: async (params) => {
      record("createChannel", params);
      return { id: `ch-${params.name}`, name: params.name };
    },
    changeChannelPermissions: async (params) => {
      record("changeChannelPermissions", params);
    },
    deleteChannel: async (channelId) => {
      record("deleteChannel", channelId);
    },
    addRoleToRoleMembers: async (params) => {
      record("addRoleToRoleMembers", params);
    },
    sendMessage: async (message) => {
      record("sendMessage", message);
    },
  };

  const ctx: ExecuteContext = {
    guildId: "guild-1",
    sessionId: 1,
    sessionName: options.sessionName ?? "テストセッション",
    discord,
    branchChoice: options.branchChoice,
    flags: {
      get: () => ({ ...state.flags }),
      set: async (patch) => {
        Object.assign(state.flags, patch);
      },
    },
    resources: {
      roles: state.roles,
      channels: state.channels,
      categories: state.categories,
      addRole: async (role) => {
        state.roles.push(role);
      },
      removeRole: async (roleId) => {
        const index = state.roles.findIndex((role) => role.id === roleId);
        if (index >= 0) state.roles.splice(index, 1);
      },
      addCategory: async (category) => {
        state.categories.push(category);
      },
      removeCategory: async (categoryId) => {
        const index = state.categories.findIndex((category) => category.id === categoryId);
        if (index >= 0) state.categories.splice(index, 1);
      },
      addChannel: async (channel) => {
        state.channels.push(channel);
      },
      removeChannel: async (channelId) => {
        const index = state.channels.findIndex((channel) => channel.id === channelId);
        if (index >= 0) state.channels.splice(index, 1);
      },
      updateChannel: async (channelId, patch) => {
        const channel = state.channels.find((item) => item.id === channelId);
        if (channel !== undefined) Object.assign(channel, patch);
      },
    },
  };

  return { ctx, state };
};
