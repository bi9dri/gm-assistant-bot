import { createTestSession } from "#test/factories";
import { describe, test, expect, spyOn } from "bun:test";

import { defaultReactFlowData } from "../schemas";

describe("GameSession", () => {
  // Tables are cleared in test/unit.setup.ts afterEach

  describe("update", () => {
    test("lastUsedAtを常に更新する", async () => {
      const session = await createTestSession({});
      const originalLastUsedAt = session.lastUsedAt;

      // 時間差を確保するために少し待機
      await new Promise((resolve) => setTimeout(resolve, 10));

      await session.update({ name: "Updated Name" });

      expect(session.lastUsedAt.getTime()).toBeGreaterThan(originalLastUsedAt.getTime());
    });

    test("名前のみを更新し、他のフィールドは保持する", async () => {
      const session = await createTestSession({ name: "Original" });
      const originalGameFlags = session.gameFlags;
      const originalReactFlowData = session.reactFlowData;

      await session.update({ name: "New Name" });

      expect(session.name).toBe("New Name");
      expect(session.gameFlags).toBe(originalGameFlags);
      expect(session.reactFlowData).toBe(originalReactFlowData);
    });

    test("gameFlagsをZodバリデーション付きで更新する", async () => {
      const session = await createTestSession({});

      await session.update({ gameFlags: { key1: "value1", key2: 123 } });

      expect(session.getParsedGameFlags()).toEqual({ key1: "value1", key2: 123 });
    });

    test("reactFlowDataをJSONエンコードして更新する", async () => {
      const session = await createTestSession({});
      const newReactFlowData = {
        nodes: [{ id: "1", type: "test", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      await session.update({ reactFlowData: newReactFlowData });

      expect(session.getParsedReactFlowData()).toEqual(newReactFlowData);
    });

    test("reactFlowDataのバリデーションが失敗した場合はエラーをスローする", async () => {
      const session = await createTestSession({});

      // 無効なreactFlowData（必須フィールドが欠落）
      const invalidData = { nodes: [] } as unknown as Parameters<
        typeof session.update
      >[0]["reactFlowData"];

      expect(session.update({ reactFlowData: invalidData })).rejects.toThrow();
    });

    test("更新時に名前をトリムする", async () => {
      const session = await createTestSession({});

      await session.update({ name: "  Trimmed Name  " });

      expect(session.name).toBe("Trimmed Name");
    });
  });

  describe("getParsedGameFlags", () => {
    test("有効なJSONを正常にパースする", async () => {
      const session = await createTestSession({});
      await session.update({ gameFlags: { flag1: true, flag2: "test" } });

      const parsed = session.getParsedGameFlags();

      expect(parsed).toEqual({ flag1: true, flag2: "test" });
    });

    test("無効なJSONの場合は空オブジェクトを返す", async () => {
      const session = await createTestSession({});

      // 無効なJSONを手動で設定
      session.gameFlags = "invalid json {";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = session.getParsedGameFlags();
      consoleSpy.mockRestore();

      expect(parsed).toEqual({});
    });
  });

  describe("getParsedReactFlowData", () => {
    test("有効なJSONを正常にパースする", async () => {
      const session = await createTestSession({});
      const reactFlowData = {
        nodes: [{ id: "node1" }],
        edges: [{ id: "edge1" }],
        viewport: { x: 10, y: 20, zoom: 2 },
      };
      await session.update({ reactFlowData });

      const parsed = session.getParsedReactFlowData();

      expect(parsed).toEqual(reactFlowData);
    });

    test("無効なJSONの場合はdefaultReactFlowDataを返す", async () => {
      const session = await createTestSession({});

      // 無効なJSONを手動で設定
      session.reactFlowData = "not valid json";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = session.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });

    test("バリデーションが失敗した場合はdefaultReactFlowDataを返す", async () => {
      const session = await createTestSession({});

      // パースは成功するがZodバリデーションが失敗するJSONを設定
      session.reactFlowData = JSON.stringify({ nodes: "not an array" });

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = session.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });
  });
});
