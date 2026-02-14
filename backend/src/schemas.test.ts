import { describe, test, expect } from "bun:test";
import { ZodError } from "zod";

import {
  createRoleSchema,
  deleteRoleSchema,
  createCategorySchema,
  createChannelSchema,
  changeChannelPermissionsSchema,
  deleteChannelSchema,
  addRoleToRoleMembersSchema,
  sendMessageSchema,
} from "./schemas";

describe("createRoleSchema", () => {
  test("rejects empty guildId", () => {
    expect(() => createRoleSchema.parse({ guildId: "", name: "Role" })).toThrow(ZodError);
  });

  test("trims whitespace and rejects whitespace-only name", () => {
    expect(() => createRoleSchema.parse({ guildId: "123", name: "   " })).toThrow(ZodError);
  });
});

describe("deleteRoleSchema", () => {
  test("rejects empty roleId", () => {
    expect(() => deleteRoleSchema.parse({ guildId: "123", roleId: "" })).toThrow(ZodError);
  });

  test("rejects missing required field", () => {
    expect(() => deleteRoleSchema.parse({ guildId: "123" })).toThrow(ZodError);
  });
});

describe("createCategorySchema", () => {
  test("rejects empty name", () => {
    expect(() => createCategorySchema.parse({ guildId: "123", name: "" })).toThrow(ZodError);
  });

  test("rejects whitespace-only guildId", () => {
    expect(() => createCategorySchema.parse({ guildId: "  ", name: "Category" })).toThrow(ZodError);
  });
});

describe("createChannelSchema", () => {
  test("rejects invalid channel type", () => {
    expect(() =>
      createChannelSchema.parse({
        guildId: "123",
        parentCategoryId: "456",
        name: "Channel",
        type: "invalid",
        writerRoleIds: [],
        readerRoleIds: [],
      }),
    ).toThrow(ZodError);
  });

  test("accepts valid text channel", () => {
    const result = createChannelSchema.parse({
      guildId: "123",
      parentCategoryId: "456",
      name: "Channel",
      type: "text",
      writerRoleIds: ["role1"],
      readerRoleIds: ["role2"],
    });
    expect(result.type).toBe("text");
  });

  test("accepts valid voice channel", () => {
    const result = createChannelSchema.parse({
      guildId: "123",
      parentCategoryId: "456",
      name: "Voice",
      type: "voice",
      writerRoleIds: [],
      readerRoleIds: [],
    });
    expect(result.type).toBe("voice");
  });

  test("rejects empty parentCategoryId", () => {
    expect(() =>
      createChannelSchema.parse({
        guildId: "123",
        parentCategoryId: "",
        name: "Channel",
        type: "text",
        writerRoleIds: [],
        readerRoleIds: [],
      }),
    ).toThrow(ZodError);
  });
});

describe("changeChannelPermissionsSchema", () => {
  test("rejects empty channelId", () => {
    expect(() =>
      changeChannelPermissionsSchema.parse({
        guildId: "123",
        channelId: "",
        writerRoleIds: [],
        readerRoleIds: [],
      }),
    ).toThrow(ZodError);
  });

  test("accepts empty role arrays", () => {
    const result = changeChannelPermissionsSchema.parse({
      guildId: "123",
      channelId: "456",
      writerRoleIds: [],
      readerRoleIds: [],
    });
    expect(result.writerRoleIds).toEqual([]);
    expect(result.readerRoleIds).toEqual([]);
  });

  test("rejects empty string in writerRoleIds array", () => {
    expect(() =>
      changeChannelPermissionsSchema.parse({
        guildId: "123",
        channelId: "456",
        writerRoleIds: [""],
        readerRoleIds: [],
      }),
    ).toThrow(ZodError);
  });
});

describe("deleteChannelSchema", () => {
  test("rejects empty channelId", () => {
    expect(() => deleteChannelSchema.parse({ guildId: "123", channelId: "" })).toThrow(ZodError);
  });

  test("rejects missing guildId", () => {
    expect(() => deleteChannelSchema.parse({ channelId: "456" })).toThrow(ZodError);
  });
});

describe("addRoleToRoleMembersSchema", () => {
  test("rejects empty memberRoleId", () => {
    expect(() =>
      addRoleToRoleMembersSchema.parse({
        guildId: "123",
        memberRoleId: "",
        addRoleId: "789",
      }),
    ).toThrow(ZodError);
  });

  test("rejects whitespace-only addRoleId", () => {
    expect(() =>
      addRoleToRoleMembersSchema.parse({
        guildId: "123",
        memberRoleId: "456",
        addRoleId: "   ",
      }),
    ).toThrow(ZodError);
  });
});

describe("sendMessageSchema", () => {
  test("rejects empty content", () => {
    expect(() => sendMessageSchema.parse({ channelId: "123", content: "" })).toThrow(ZodError);
  });

  test("rejects whitespace-only content", () => {
    expect(() => sendMessageSchema.parse({ channelId: "123", content: "   " })).toThrow(ZodError);
  });

  test("accepts optional files field", () => {
    const result = sendMessageSchema.parse({
      channelId: "123",
      content: "Message",
    });
    expect(result.files).toBeUndefined();
  });
});
