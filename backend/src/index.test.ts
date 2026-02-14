import { DiscordAPIError, RateLimitError } from "@discordjs/rest";
import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";

import * as discord from "./discord";
import app from "./index";
import { BOT_TOKEN_HEADER } from "./schemas";

const TEST_TOKEN = "test-bot-token";

describe("Health endpoint", () => {
  test("GET /health returns ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("Authentication middleware", () => {
  test("returns 401 when bot token is missing", async () => {
    const res = await app.request("/api/profile");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Bot token is required" });
  });
});

describe("Profile endpoint", () => {
  let getProfileSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    getProfileSpy = spyOn(discord, "getProfile");
  });

  afterEach(() => {
    getProfileSpy.mockRestore();
  });

  test("GET /api/profile returns profile", async () => {
    const mockProfile = { id: "123", name: "TestBot", icon: "https://example.com/icon.png" };
    getProfileSpy.mockResolvedValue(mockProfile);

    const res = await app.request("/api/profile", {
      headers: { [BOT_TOKEN_HEADER]: TEST_TOKEN },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ profile: mockProfile });
    expect(getProfileSpy).toHaveBeenCalledWith(TEST_TOKEN);
  });
});

describe("Guilds endpoint", () => {
  let getGuildsSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    getGuildsSpy = spyOn(discord, "getGuilds");
  });

  afterEach(() => {
    getGuildsSpy.mockRestore();
  });

  test("GET /api/guilds returns guilds", async () => {
    const mockGuilds = [
      { id: "1", name: "Guild 1", icon: "https://example.com/icon1.png" },
      { id: "2", name: "Guild 2", icon: "https://example.com/icon2.png" },
    ];
    getGuildsSpy.mockResolvedValue(mockGuilds);

    const res = await app.request("/api/guilds", {
      headers: { [BOT_TOKEN_HEADER]: TEST_TOKEN },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ guilds: mockGuilds });
    expect(getGuildsSpy).toHaveBeenCalledWith(TEST_TOKEN);
  });
});

describe("Role endpoints", () => {
  let createRoleSpy: ReturnType<typeof spyOn>;
  let deleteRoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    createRoleSpy = spyOn(discord, "createRole");
    deleteRoleSpy = spyOn(discord, "deleteRole");
  });

  afterEach(() => {
    createRoleSpy.mockRestore();
    deleteRoleSpy.mockRestore();
  });

  test("POST /api/roles creates role", async () => {
    const mockRole = { id: "role-123", name: "Player" };
    createRoleSpy.mockResolvedValue(mockRole);

    const res = await app.request("/api/roles", {
      method: "POST",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guildId: "guild-123", name: "Player" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ role: mockRole });
    expect(createRoleSpy).toHaveBeenCalledWith(TEST_TOKEN, {
      guildId: "guild-123",
      name: "Player",
    });
  });

  test("POST /api/roles returns validation error for invalid data", async () => {
    const res = await app.request("/api/roles", {
      method: "POST",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guildId: "", name: "Player" }),
    });

    expect(res.status).toBe(400);
  });

  test("DELETE /api/roles deletes role", async () => {
    deleteRoleSpy.mockResolvedValue(undefined);

    const res = await app.request("/api/roles", {
      method: "DELETE",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guildId: "guild-123", roleId: "role-123" }),
    });

    expect(res.status).toBe(204);
    expect(deleteRoleSpy).toHaveBeenCalledWith(TEST_TOKEN, {
      guildId: "guild-123",
      roleId: "role-123",
    });
  });
});

describe("Category endpoint", () => {
  let createCategorySpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    createCategorySpy = spyOn(discord, "createCategory");
  });

  afterEach(() => {
    createCategorySpy.mockRestore();
  });

  test("POST /api/categories creates category", async () => {
    const mockCategory = { id: "cat-123", name: "Game" };
    createCategorySpy.mockResolvedValue(mockCategory);

    const res = await app.request("/api/categories", {
      method: "POST",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guildId: "guild-123", name: "Game" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ category: mockCategory });
    expect(createCategorySpy).toHaveBeenCalledWith(TEST_TOKEN, {
      guildId: "guild-123",
      name: "Game",
    });
  });
});

describe("Channel endpoints", () => {
  let createChannelSpy: ReturnType<typeof spyOn>;
  let deleteChannelSpy: ReturnType<typeof spyOn>;
  let changeChannelPermissionsSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    createChannelSpy = spyOn(discord, "createChannel");
    deleteChannelSpy = spyOn(discord, "deleteChannel");
    changeChannelPermissionsSpy = spyOn(discord, "changeChannelPermissions");
  });

  afterEach(() => {
    createChannelSpy.mockRestore();
    deleteChannelSpy.mockRestore();
    changeChannelPermissionsSpy.mockRestore();
  });

  test("POST /api/channels creates channel", async () => {
    const mockChannel = { id: "ch-123", name: "general" };
    createChannelSpy.mockResolvedValue(mockChannel);

    const res = await app.request("/api/channels", {
      method: "POST",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guildId: "guild-123",
        parentCategoryId: "cat-123",
        name: "general",
        type: "text",
        writerRoleIds: ["role-1"],
        readerRoleIds: ["role-2"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ channel: mockChannel });
  });

  test("DELETE /api/channels deletes channel", async () => {
    deleteChannelSpy.mockResolvedValue(undefined);

    const res = await app.request("/api/channels", {
      method: "DELETE",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guildId: "guild-123", channelId: "ch-123" }),
    });

    expect(res.status).toBe(204);
    expect(deleteChannelSpy).toHaveBeenCalledWith(TEST_TOKEN, {
      guildId: "guild-123",
      channelId: "ch-123",
    });
  });

  test("PATCH /api/channels/permissions updates permissions", async () => {
    changeChannelPermissionsSpy.mockResolvedValue(undefined);

    const res = await app.request("/api/channels/permissions", {
      method: "PATCH",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guildId: "guild-123",
        channelId: "ch-123",
        writerRoleIds: ["role-1"],
        readerRoleIds: ["role-2"],
      }),
    });

    expect(res.status).toBe(204);
    expect(changeChannelPermissionsSpy).toHaveBeenCalledWith(TEST_TOKEN, {
      guildId: "guild-123",
      channelId: "ch-123",
      writerRoleIds: ["role-1"],
      readerRoleIds: ["role-2"],
    });
  });
});

describe("Message endpoint", () => {
  let sendMessageSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    sendMessageSpy = spyOn(discord, "sendMessage");
  });

  afterEach(() => {
    sendMessageSpy.mockRestore();
  });

  test("POST /api/messages sends message", async () => {
    sendMessageSpy.mockResolvedValue(undefined);

    const formData = new FormData();
    formData.append("channelId", "ch-123");
    formData.append("content", "Hello, world!");

    const res = await app.request("/api/messages", {
      method: "POST",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
      },
      body: formData,
    });

    expect(res.status).toBe(204);
    expect(sendMessageSpy).toHaveBeenCalled();
  });
});

describe("AddRoleToRoleMembers endpoint", () => {
  let addRoleToRoleMembersSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    addRoleToRoleMembersSpy = spyOn(discord, "addRoleToRoleMembers");
  });

  afterEach(() => {
    addRoleToRoleMembersSpy.mockRestore();
  });

  test("POST /api/roles/addRoleToRoleMembers adds role to members", async () => {
    addRoleToRoleMembersSpy.mockResolvedValue(undefined);

    const res = await app.request("/api/roles/addRoleToRoleMembers", {
      method: "POST",
      headers: {
        [BOT_TOKEN_HEADER]: TEST_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guildId: "guild-123",
        memberRoleId: "role-1",
        addRoleId: "role-2",
      }),
    });

    expect(res.status).toBe(204);
    expect(addRoleToRoleMembersSpy).toHaveBeenCalledWith(TEST_TOKEN, {
      guildId: "guild-123",
      memberRoleId: "role-1",
      addRoleId: "role-2",
    });
  });
});

describe("Error handling", () => {
  test("returns 404 for unknown routes", async () => {
    const res = await app.request("/unknown", {
      headers: { [BOT_TOKEN_HEADER]: TEST_TOKEN },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not Found" });
  });

  test("handles Discord API errors", async () => {
    const getProfileSpy = spyOn(discord, "getProfile");
    const apiError = new DiscordAPIError(
      { message: "Invalid token", code: 50001 },
      50001,
      401,
      "GET",
      "/users/@me",
      {},
    );
    getProfileSpy.mockRejectedValue(apiError);

    const res = await app.request("/api/profile", {
      headers: { [BOT_TOKEN_HEADER]: TEST_TOKEN },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");

    getProfileSpy.mockRestore();
  });

  test("handles rate limit errors", async () => {
    const getProfileSpy = spyOn(discord, "getProfile");
    const rateLimitError = new RateLimitError({
      global: false,
      retryAfter: 5000,
      hash: "test-hash",
      limit: 10,
      majorParameter: "test",
      method: "GET",
      route: "/test",
      scope: "user",
      timeToReset: 5000,
      url: "/test",
      sublimitTimeout: 0,
    });
    getProfileSpy.mockRejectedValue(rateLimitError);

    const res = await app.request("/api/profile", {
      headers: { [BOT_TOKEN_HEADER]: TEST_TOKEN },
    });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Rate limited");
    expect(body).toHaveProperty("retryAfter");

    getProfileSpy.mockRestore();
  });

  test("handles generic errors", async () => {
    const getProfileSpy = spyOn(discord, "getProfile");
    getProfileSpy.mockRejectedValue(new Error("Something went wrong"));

    const res = await app.request("/api/profile", {
      headers: { [BOT_TOKEN_HEADER]: TEST_TOKEN },
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong" });

    getProfileSpy.mockRestore();
  });
});
