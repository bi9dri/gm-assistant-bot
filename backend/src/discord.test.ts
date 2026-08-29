import { describe, test, expect } from "bun:test";

import type { APIReaction, RESTGetAPIGuildMemberResult } from "discord-api-types/v10";

import {
  getDefaultAvatarIndex,
  getGuildIconUrl,
  getMemberDisplayName,
  getUserAvatarUrl,
  toVoteCounts,
} from "./discord";

describe("getDefaultAvatarIndex", () => {
  test("returns same index for same ID", () => {
    const id = "123456789";
    const index1 = getDefaultAvatarIndex(id);
    const index2 = getDefaultAvatarIndex(id);
    expect(index1).toBe(index2);
  });

  test("returns index in range 0-5", () => {
    const ids = ["123", "456789", "987654321", "111111111111111111"];
    for (const id of ids) {
      const index = getDefaultAvatarIndex(id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(5);
    }
  });

  test("returns 0 for empty string", () => {
    const index = getDefaultAvatarIndex("");
    expect(index).toBe(0);
  });

  test("returns different indices for different IDs (distribution test)", () => {
    const indices = new Set<number>();
    const testIds = ["123456789", "987654321", "111111111", "222222222", "333333333", "444444444"];
    for (const id of testIds) {
      indices.add(getDefaultAvatarIndex(id));
    }
    expect(indices.size).toBeGreaterThan(1);
  });
});

describe("getGuildIconUrl", () => {
  test("returns default avatar URL when iconHash is null", () => {
    const guildId = "123456789";
    const url = getGuildIconUrl(guildId, null);
    const avatarIndex = getDefaultAvatarIndex(guildId);
    expect(url).toBe(`https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`);
  });

  test("returns custom icon URL when iconHash is provided", () => {
    const guildId = "123456789";
    const iconHash = "abc123def456";
    const url = getGuildIconUrl(guildId, iconHash);
    expect(url).toBe(`https://cdn.discordapp.com/icons/${guildId}/${iconHash}.webp`);
  });

  test("returns different default avatars for different guild IDs", () => {
    const url1 = getGuildIconUrl("123456789", null);
    const url2 = getGuildIconUrl("987654321", null);
    expect(url1).not.toBe(url2);
  });
});

describe("getUserAvatarUrl", () => {
  test("returns default avatar URL when avatarHash is null", () => {
    const userId = "123456789";
    const url = getUserAvatarUrl(userId, null);
    const avatarIndex = getDefaultAvatarIndex(userId);
    expect(url).toBe(`https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`);
  });

  test("returns custom avatar URL when avatarHash is provided", () => {
    const userId = "123456789";
    const avatarHash = "xyz789abc123";
    const url = getUserAvatarUrl(userId, avatarHash);
    expect(url).toBe(`https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp`);
  });

  test("returns different default avatars for different user IDs", () => {
    const url1 = getUserAvatarUrl("123456789", null);
    const url2 = getUserAvatarUrl("987654321", null);
    expect(url1).not.toBe(url2);
  });
});

describe("getMemberDisplayName", () => {
  const member = (nick: string | null, globalName: string | null, username: string) =>
    ({ nick, user: { global_name: globalName, username } }) as RESTGetAPIGuildMemberResult;

  test("prefers guild nickname", () => {
    expect(getMemberDisplayName(member("探偵", "Global", "user1"))).toBe("探偵");
  });

  test("falls back to global name when nickname is unset", () => {
    expect(getMemberDisplayName(member(null, "Global", "user1"))).toBe("Global");
  });

  test("falls back to username when both are unset", () => {
    expect(getMemberDisplayName(member(null, null, "user1"))).toBe("user1");
  });
});

describe("toVoteCounts", () => {
  const reaction = (name: string, count: number, me: boolean) =>
    ({ emoji: { name }, count, me }) as APIReaction;

  test("converts reactions of multiple emojis into per-emoji counts", () => {
    expect(toVoteCounts([reaction("1️⃣", 4, true), reaction("2️⃣", 2, true)])).toEqual([
      { emoji: "1️⃣", count: 3 },
      { emoji: "2️⃣", count: 1 },
    ]);
  });

  test("excludes the bot's own reaction", () => {
    expect(toVoteCounts([reaction("1️⃣", 1, true)])).toEqual([{ emoji: "1️⃣", count: 0 }]);
  });

  test("keeps the count when the bot did not react", () => {
    expect(toVoteCounts([reaction("1️⃣", 2, false)])).toEqual([{ emoji: "1️⃣", count: 2 }]);
  });

  test("returns an empty list when nobody reacted", () => {
    expect(toVoteCounts(undefined)).toEqual([]);
  });
});
