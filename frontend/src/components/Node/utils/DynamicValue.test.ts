import { describe, test, expect } from "bun:test";

import {
  resolveDynamicValue,
  defaultDynamicValue,
  type DynamicValue,
  type DynamicValueContext,
} from "./DynamicValue";

describe("resolveDynamicValue", () => {
  test.each([
    [{ type: "literal" as const, value: "hello" }, {}, "hello"],
    [{ type: "literal" as const, value: "" }, {}, ""],
    [{ type: "literal" as const, value: "123" }, {}, "123"],
  ])("literal type: %o → %s", (value, context, expected) => {
    expect(resolveDynamicValue(value, context)).toBe(expected);
  });

  test.each([
    [{ type: "session.name" as const }, { sessionName: "Test Session" }, "Test Session"],
    [{ type: "session.name" as const }, {}, ""],
    [{ type: "session.name" as const }, { sessionName: undefined }, ""],
  ])("session.name type: context %o → %s", (value, context, expected) => {
    expect(resolveDynamicValue(value, context)).toBe(expected);
  });

  test.each([
    [
      { type: "roleRef" as const, roleName: "Player" },
      { roles: new Map([["Player", "role-123"]]) },
      "role-123",
    ],
    [{ type: "roleRef" as const, roleName: "Player" }, {}, "Player"],
    [{ type: "roleRef" as const, roleName: "Player" }, { roles: new Map() }, "Player"],
    [
      { type: "roleRef" as const, roleName: "Unknown" },
      { roles: new Map([["Player", "role-123"]]) },
      "Unknown",
    ],
  ])("roleRef type: %o with context %o → %s", (value, context, expected) => {
    expect(resolveDynamicValue(value, context)).toBe(expected);
  });

  test.each([
    [
      { type: "channelRef" as const, channelName: "general" },
      { channels: new Map([["general", "channel-456"]]) },
      "channel-456",
    ],
    [{ type: "channelRef" as const, channelName: "general" }, {}, "general"],
    [{ type: "channelRef" as const, channelName: "general" }, { channels: new Map() }, "general"],
    [
      { type: "channelRef" as const, channelName: "random" },
      { channels: new Map([["general", "channel-456"]]) },
      "random",
    ],
  ])("channelRef type: %o with context %o → %s", (value, context, expected) => {
    expect(resolveDynamicValue(value, context)).toBe(expected);
  });

  test.each([
    [{ type: "gameFlag" as const, flagKey: "score" }, { gameFlags: { score: "100" } }, "100"],
    [{ type: "gameFlag" as const, flagKey: "score" }, {}, ""],
    [{ type: "gameFlag" as const, flagKey: "score" }, { gameFlags: {} }, ""],
    [{ type: "gameFlag" as const, flagKey: "missing" }, { gameFlags: { score: "100" } }, ""],
  ])("gameFlag type: %o with context %o → %s", (value, context, expected) => {
    expect(resolveDynamicValue(value, context)).toBe(expected);
  });

  test("unknown type returns empty string", () => {
    const unknownValue = { type: "unknown" } as unknown as DynamicValue;
    const result = resolveDynamicValue(unknownValue, {});
    expect(result).toBe("");
  });

  test("full context integration", () => {
    const context: DynamicValueContext = {
      sessionName: "My Session",
      roles: new Map([
        ["Player", "role-1"],
        ["GM", "role-2"],
      ]),
      channels: new Map([
        ["general", "channel-1"],
        ["announcements", "channel-2"],
      ]),
      gameFlags: {
        turn: "3",
        winner: "Alice",
      },
    };

    expect(resolveDynamicValue({ type: "literal", value: "test" }, context)).toBe("test");
    expect(resolveDynamicValue({ type: "session.name" }, context)).toBe("My Session");
    expect(resolveDynamicValue({ type: "roleRef", roleName: "Player" }, context)).toBe("role-1");
    expect(resolveDynamicValue({ type: "channelRef", channelName: "general" }, context)).toBe(
      "channel-1",
    );
    expect(resolveDynamicValue({ type: "gameFlag", flagKey: "turn" }, context)).toBe("3");
  });
});

describe("defaultDynamicValue", () => {
  test("returns literal type with empty value", () => {
    const result = defaultDynamicValue();
    expect(result).toEqual({ type: "literal", value: "" });
  });
});
