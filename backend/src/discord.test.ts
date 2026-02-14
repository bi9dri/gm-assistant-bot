import { describe, test, expect } from "bun:test";

import { getDefaultAvatarIndex, getGuildIconUrl, getUserAvatarUrl } from "./discord";

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
