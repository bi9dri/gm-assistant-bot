import { describe, test, expect, spyOn } from "bun:test";

import { defaultReactFlowData } from "../schemas";
import { Template } from "./Template";

describe("Template", () => {
  // Tables are cleared in test/unit.setup.ts afterEach

  describe("update", () => {
    test("名前のみを更新し、他のフィールドは保持する", async () => {
      const template = await Template.create("Original Name");
      const originalGameFlags = template.gameFlags;
      const originalReactFlowData = template.reactFlowData;

      await template.update({ name: "New Name" });

      expect(template.name).toBe("New Name");
      expect(template.gameFlags).toBe(originalGameFlags);
      expect(template.reactFlowData).toBe(originalReactFlowData);
    });

    test("gameFlagsをZodバリデーション付きで更新する", async () => {
      const template = await Template.create("Test");

      await template.update({ gameFlags: { key1: "value1", key2: 123 } });

      expect(template.getParsedGameFlags()).toEqual({ key1: "value1", key2: 123 });
    });

    test("reactFlowDataをJSONエンコードして更新する", async () => {
      const template = await Template.create("Test");
      const newReactFlowData = {
        nodes: [{ id: "1", type: "test", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      await template.update({ reactFlowData: newReactFlowData });

      expect(template.getParsedReactFlowData()).toEqual(newReactFlowData);
    });

    test("reactFlowDataのバリデーションが失敗した場合はエラーをスローする", async () => {
      const template = await Template.create("Test");

      // 無効なreactFlowData（必須フィールドが欠落）
      const invalidData = { nodes: [] } as unknown as Parameters<
        typeof template.update
      >[0]["reactFlowData"];

      expect(template.update({ reactFlowData: invalidData })).rejects.toThrow();
    });

    test("updatedAtタイムスタンプを更新する", async () => {
      const template = await Template.create("Test");
      const originalUpdatedAt = template.updatedAt;

      // 時間差を確保するために少し待機
      await new Promise((resolve) => setTimeout(resolve, 10));

      await template.update({ name: "Updated" });

      expect(template.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("getParsedGameFlags", () => {
    test("有効なJSONを正常にパースする", async () => {
      const template = await Template.create("Test");
      await template.update({ gameFlags: { flag1: true, flag2: "test" } });

      const parsed = template.getParsedGameFlags();

      expect(parsed).toEqual({ flag1: true, flag2: "test" });
    });

    test("無効なJSONの場合は空オブジェクトを返す", async () => {
      const template = await Template.create("Test");

      // 無効なJSONを手動で設定
      template.gameFlags = "invalid json {";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = template.getParsedGameFlags();
      consoleSpy.mockRestore();

      expect(parsed).toEqual({});
    });
  });

  describe("getParsedReactFlowData", () => {
    test("有効なJSONを正常にパースする", async () => {
      const template = await Template.create("Test");
      const reactFlowData = {
        nodes: [{ id: "node1" }],
        edges: [{ id: "edge1" }],
        viewport: { x: 10, y: 20, zoom: 2 },
      };
      await template.update({ reactFlowData });

      const parsed = template.getParsedReactFlowData();

      expect(parsed).toEqual(reactFlowData);
    });

    test("無効なJSONの場合はdefaultReactFlowDataを返す", async () => {
      const template = await Template.create("Test");

      // 無効なJSONを手動で設定
      template.reactFlowData = "not valid json";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = template.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });

    test("バリデーションが失敗した場合はdefaultReactFlowDataを返す", async () => {
      const template = await Template.create("Test");

      // パースは成功するがZodバリデーションが失敗するJSONを設定
      template.reactFlowData = JSON.stringify({ nodes: "not an array" });

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = template.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });
  });

  describe("import", () => {
    test("バージョン1の有効なテンプレートをインポートする", async () => {
      const exportData = {
        version: 1,
        name: "Imported Template",
        gameFlags: { key: "value" },
        reactFlowData: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      };

      const template = await Template.import(exportData);

      expect(template.name).toBe("Imported Template");
      expect(template.getParsedGameFlags()).toEqual({ key: "value" });
    });

    test("サポートされていないバージョンの場合はエラーをスローする", async () => {
      const exportData = {
        version: 2,
        name: "Test",
        gameFlags: {},
        reactFlowData: defaultReactFlowData,
      };

      expect(Template.import(exportData)).rejects.toThrow();
    });

    test("無効なスキーマの場合はZodエラーをスローする", async () => {
      const invalidData = {
        version: 1,
        // 必須フィールドが欠落
      };

      expect(Template.import(invalidData)).rejects.toThrow();
    });

    test("名前が空の場合はエラーをスローする", async () => {
      const exportData = {
        version: 1,
        name: "",
        gameFlags: {},
        reactFlowData: defaultReactFlowData,
      };

      expect(Template.import(exportData)).rejects.toThrow();
    });
  });

  describe("export", () => {
    test("パースされたデータを含むテンプレートをエクスポートする", async () => {
      const template = await Template.create("Export Test");
      await template.update({
        gameFlags: { exported: true },
        reactFlowData: {
          nodes: [{ id: "1" }],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      });

      const exported = template.export();

      expect(exported.version).toBe(1);
      expect(exported.name).toBe("Export Test");
      expect(exported.gameFlags).toEqual({ exported: true });
      expect(exported.reactFlowData.nodes).toHaveLength(1);
    });
  });

  describe("static methods", () => {
    test("getAll returns all templates", async () => {
      await Template.create("T1");
      await Template.create("T2");
      const all = await Template.getAll();
      expect(all.length).toBe(2);
    });

    test("delete removes template from DB", async () => {
      const template = await Template.create("To Delete");
      await Template.delete(template.id);
      const result = await Template.getById(template.id);
      expect(result).toBeUndefined();
    });
  });
});
