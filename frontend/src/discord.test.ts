import { describe, test, expect, mock, beforeEach } from "bun:test";

import { DiscordClient } from "./discord";

// APIコール用のモックレスポンス型
type MockResponse = Promise<{
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMock = (fn: () => MockResponse) => mock(fn) as any;

// apiモジュールをモック
const mockApi = {
  profile: {
    $get: createMock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profile: { id: "123", username: "TestBot" } }),
      }),
    ),
  },
  guilds: {
    $get: createMock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ guilds: [{ id: "guild1", name: "Test Guild" }] }),
      }),
    ),
  },
  roles: {
    $post: createMock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ role: { id: "role1", name: "Test Role" } }),
      }),
    ),
    $delete: createMock(() => Promise.resolve({ ok: true })),
    addRoleToRoleMembers: {
      $post: createMock(() => Promise.resolve({ ok: true })),
    },
  },
  categories: {
    $post: createMock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ category: { id: "cat1", name: "Test Category" } }),
      }),
    ),
  },
  channels: {
    $post: createMock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ channel: { id: "ch1", name: "Test Channel" } }),
      }),
    ),
    $delete: createMock(() => Promise.resolve({ ok: true })),
    permissions: {
      $patch: createMock(() => Promise.resolve({ ok: true })),
    },
  },
  messages: {
    $post: createMock(() => Promise.resolve({ ok: true })),
  },
};

// apiモジュールのインポートをモック
await mock.module("./api", () => ({
  default: mockApi,
  BOT_TOKEN_HEADER: "X-Discord-Bot-Token",
}));

describe("DiscordClient", () => {
  let client: DiscordClient;

  beforeEach(() => {
    client = new DiscordClient("test-token");

    // すべてのモックをリセット
    for (const key of Object.keys(mockApi)) {
      const endpoint = mockApi[key as keyof typeof mockApi];
      if (typeof endpoint === "object") {
        for (const method of Object.keys(endpoint)) {
          const fn = endpoint[method as keyof typeof endpoint];
          if (typeof fn === "function" && "mockClear" in fn) {
            (fn as ReturnType<typeof mock>).mockClear();
          } else if (typeof fn === "object") {
            for (const subMethod of Object.keys(fn)) {
              const subFn = fn[subMethod as keyof typeof fn];
              if (typeof subFn === "function" && "mockClear" in subFn) {
                (subFn as ReturnType<typeof mock>).mockClear();
              }
            }
          }
        }
      }
    }
  });

  describe("getErrorMessage（エラーレスポンス経由）", () => {
    test('{ error: "message" }からエラーメッセージを抽出する', async () => {
      mockApi.profile.$get.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Invalid token" }),
        }),
      );

      expect(client.getProfile()).rejects.toThrow("Invalid token");
    });

    test("エラーが文字列でない場合はステータスコードを使用する", async () => {
      mockApi.profile.$get.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 123 }),
        }),
      );

      expect(client.getProfile()).rejects.toThrow("404");
    });

    test("エラープロパティがない場合はステータスコードを使用する", async () => {
      mockApi.profile.$get.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: "Something went wrong" }),
        }),
      );

      expect(client.getProfile()).rejects.toThrow("500");
    });
  });

  describe("getProfile", () => {
    test("成功時にプロフィールを返す", async () => {
      mockApi.profile.$get.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ profile: { id: "bot123", username: "MyBot" } }),
        }),
      );

      const profile = await client.getProfile();

      expect(profile).toEqual(expect.objectContaining({ id: "bot123", username: "MyBot" }));
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.profile.$get.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Unauthorized" }),
        }),
      );

      expect(client.getProfile()).rejects.toThrow("Failed to get profile: Unauthorized");
    });
  });

  describe("getGuilds", () => {
    test("成功時にギルド一覧を返す", async () => {
      mockApi.guilds.$get.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              guilds: [
                { id: "g1", name: "Guild 1" },
                { id: "g2", name: "Guild 2" },
              ],
            }),
        }),
      );

      const guilds = await client.getGuilds();

      expect(guilds).toHaveLength(2);
      expect(guilds[0].name).toBe("Guild 1");
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.guilds.$get.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: "Forbidden" }),
        }),
      );

      expect(client.getGuilds()).rejects.toThrow("Failed to get guilds: Forbidden");
    });
  });

  describe("createRole", () => {
    test("成功時に作成されたロールを返す", async () => {
      mockApi.roles.$post.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ role: { id: "role123", name: "Admin" } }),
        }),
      );

      const role = await client.createRole({ guildId: "guild1", name: "Admin" });

      expect(role).toEqual({ id: "role123", name: "Admin" });
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.roles.$post.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Role name too long" }),
        }),
      );

      expect(client.createRole({ guildId: "guild1", name: "Admin" })).rejects.toThrow(
        "Failed to create role: Role name too long",
      );
    });
  });

  describe("deleteRole", () => {
    test("成功時はデータを返さずに完了する", async () => {
      mockApi.roles.$delete.mockImplementation(() =>
        Promise.resolve({
          ok: true,
        }),
      );

      expect(client.deleteRole({ guildId: "guild1", roleId: "role1" })).resolves.toBeUndefined();
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.roles.$delete.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        }),
      );

      expect(client.deleteRole({ guildId: "guild1", roleId: "role1" })).rejects.toThrow(
        "Failed to delete role: 404",
      );
    });
  });

  describe("createCategory", () => {
    test("成功時に作成されたカテゴリを返す", async () => {
      mockApi.categories.$post.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ category: { id: "cat123", name: "Game" } }),
        }),
      );

      const category = await client.createCategory({ guildId: "guild1", name: "Game" });

      expect(category).toEqual({ id: "cat123", name: "Game" });
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.categories.$post.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Category limit reached" }),
        }),
      );

      expect(client.createCategory({ guildId: "guild1", name: "Game" })).rejects.toThrow(
        "Failed to create category: Category limit reached",
      );
    });
  });

  describe("createChannel", () => {
    test("成功時に作成されたチャンネルを返す", async () => {
      mockApi.channels.$post.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ channel: { id: "ch123", name: "general" } }),
        }),
      );

      const channel = await client.createChannel({
        guildId: "guild1",
        parentCategoryId: "cat1",
        name: "general",
        type: "text",
        writerRoleIds: [],
        readerRoleIds: [],
      });

      expect(channel).toEqual({ id: "ch123", name: "general" });
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.channels.$post.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Channel limit reached" }),
        }),
      );

      expect(
        client.createChannel({
          guildId: "guild1",
          parentCategoryId: "cat1",
          name: "general",
          type: "text",
          writerRoleIds: [],
          readerRoleIds: [],
        }),
      ).rejects.toThrow("Failed to create channel: Channel limit reached");
    });
  });

  describe("changeChannelPermissions", () => {
    test("成功時はデータを返さずに完了する", async () => {
      mockApi.channels.permissions.$patch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
        }),
      );

      expect(
        client.changeChannelPermissions({
          channelId: "ch1",
          writerRoleIds: ["role1"],
          readerRoleIds: ["role2"],
        }),
      ).resolves.toBeUndefined();
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.channels.permissions.$patch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 403,
        }),
      );

      expect(
        client.changeChannelPermissions({
          channelId: "ch1",
          writerRoleIds: [],
          readerRoleIds: [],
        }),
      ).rejects.toThrow("Failed to change channel permissions: 403");
    });
  });

  describe("deleteChannel", () => {
    test("成功時はデータを返さずに完了する", async () => {
      mockApi.channels.$delete.mockImplementation(() =>
        Promise.resolve({
          ok: true,
        }),
      );

      expect(
        client.deleteChannel({ guildId: "guild1", channelId: "ch1" }),
      ).resolves.toBeUndefined();
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.channels.$delete.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        }),
      );

      expect(client.deleteChannel({ guildId: "guild1", channelId: "ch1" })).rejects.toThrow(
        "Failed to delete channel: 404",
      );
    });
  });

  describe("addRoleToRoleMembers", () => {
    test("成功時はデータを返さずに完了する", async () => {
      mockApi.roles.addRoleToRoleMembers.$post.mockImplementation(() =>
        Promise.resolve({
          ok: true,
        }),
      );

      expect(
        client.addRoleToRoleMembers({
          guildId: "guild1",
          memberRoleId: "role1",
          addRoleId: "role2",
        }),
      ).resolves.toBeUndefined();
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.roles.addRoleToRoleMembers.$post.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Role not found" }),
        }),
      );

      expect(
        client.addRoleToRoleMembers({
          guildId: "guild1",
          memberRoleId: "role1",
          addRoleId: "role2",
        }),
      ).rejects.toThrow("Failed to add role to role members: Role not found");
    });
  });

  describe("sendMessage", () => {
    test("成功時はデータを返さずに完了する", async () => {
      mockApi.messages.$post.mockImplementation(() =>
        Promise.resolve({
          ok: true,
        }),
      );

      expect(
        client.sendMessage({
          channelId: "ch1",
          content: "Hello, World!",
        }),
      ).resolves.toBeUndefined();
    });

    test("失敗時にエラーをスローする", async () => {
      mockApi.messages.$post.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Message too long" }),
        }),
      );

      expect(
        client.sendMessage({
          channelId: "ch1",
          content: "Hello, World!",
        }),
      ).rejects.toThrow("Failed to send message: Message too long");
    });
  });
});
