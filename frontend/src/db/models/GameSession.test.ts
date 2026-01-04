import { describe, test, expect, spyOn } from "bun:test";

import { db } from "../instance";
import { defaultReactFlowData } from "../schemas";
import { GameSession } from "./GameSession";

// Helper to create a test session
async function createTestSession(name = "Test Session"): Promise<GameSession> {
  const id = await db.GameSession.add({
    name,
    guildId: "guild-123",
    botId: "bot-456",
    gameFlags: JSON.stringify({}),
    reactFlowData: JSON.stringify(defaultReactFlowData),
    createdAt: new Date(),
    lastUsedAt: new Date(),
  });

  const session = await GameSession.getById(id);
  if (!session) {
    throw new Error("Failed to create test session");
  }
  return session;
}

describe("GameSession", () => {
  // Tables are cleared in test/unit.setup.ts afterEach

  describe("update", () => {
    test("always updates lastUsedAt", async () => {
      const session = await createTestSession();
      const originalLastUsedAt = session.lastUsedAt;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await session.update({ name: "Updated Name" });

      expect(session.lastUsedAt.getTime()).toBeGreaterThan(originalLastUsedAt.getTime());
    });

    test("updates name only, preserving other fields", async () => {
      const session = await createTestSession("Original");
      const originalGameFlags = session.gameFlags;
      const originalReactFlowData = session.reactFlowData;

      await session.update({ name: "New Name" });

      expect(session.name).toBe("New Name");
      expect(session.gameFlags).toBe(originalGameFlags);
      expect(session.reactFlowData).toBe(originalReactFlowData);
    });

    test("updates gameFlags with Zod validation", async () => {
      const session = await createTestSession();

      await session.update({ gameFlags: { key1: "value1", key2: 123 } });

      expect(session.getParsedGameFlags()).toEqual({ key1: "value1", key2: 123 });
    });

    test("updates reactFlowData with JSON encoding", async () => {
      const session = await createTestSession();
      const newReactFlowData = {
        nodes: [{ id: "1", type: "test", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      await session.update({ reactFlowData: newReactFlowData });

      expect(session.getParsedReactFlowData()).toEqual(newReactFlowData);
    });

    test("throws error when reactFlowData validation fails", async () => {
      const session = await createTestSession();

      // Invalid reactFlowData (missing required fields)
      const invalidData = { nodes: [] } as unknown as Parameters<
        typeof session.update
      >[0]["reactFlowData"];

      expect(session.update({ reactFlowData: invalidData })).rejects.toThrow();
    });

    test("trims name when updating", async () => {
      const session = await createTestSession();

      await session.update({ name: "  Trimmed Name  " });

      expect(session.name).toBe("Trimmed Name");
    });
  });

  describe("getParsedGameFlags", () => {
    test("parses valid JSON successfully", async () => {
      const session = await createTestSession();
      await session.update({ gameFlags: { flag1: true, flag2: "test" } });

      const parsed = session.getParsedGameFlags();

      expect(parsed).toEqual({ flag1: true, flag2: "test" });
    });

    test("returns empty object for invalid JSON", async () => {
      const session = await createTestSession();

      // Manually set invalid JSON
      session.gameFlags = "invalid json {";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = session.getParsedGameFlags();
      consoleSpy.mockRestore();

      expect(parsed).toEqual({});
    });
  });

  describe("getParsedReactFlowData", () => {
    test("parses valid JSON successfully", async () => {
      const session = await createTestSession();
      const reactFlowData = {
        nodes: [{ id: "node1" }],
        edges: [{ id: "edge1" }],
        viewport: { x: 10, y: 20, zoom: 2 },
      };
      await session.update({ reactFlowData });

      const parsed = session.getParsedReactFlowData();

      expect(parsed).toEqual(reactFlowData);
    });

    test("returns defaultReactFlowData for invalid JSON", async () => {
      const session = await createTestSession();

      // Manually set invalid JSON
      session.reactFlowData = "not valid json";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = session.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });

    test("returns defaultReactFlowData when validation fails", async () => {
      const session = await createTestSession();

      // Set JSON that parses but fails Zod validation
      session.reactFlowData = JSON.stringify({ nodes: "not an array" });

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = session.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });
  });
});
