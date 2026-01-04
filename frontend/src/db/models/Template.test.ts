import { describe, test, expect, spyOn } from "bun:test";

import { defaultReactFlowData } from "../schemas";
import { Template } from "./Template";

describe("Template", () => {
  // Tables are cleared in test/unit.setup.ts afterEach

  describe("update", () => {
    test("updates name only, preserving other fields", async () => {
      const template = await Template.create("Original Name");
      const originalGameFlags = template.gameFlags;
      const originalReactFlowData = template.reactFlowData;

      await template.update({ name: "New Name" });

      expect(template.name).toBe("New Name");
      expect(template.gameFlags).toBe(originalGameFlags);
      expect(template.reactFlowData).toBe(originalReactFlowData);
    });

    test("updates gameFlags with Zod validation", async () => {
      const template = await Template.create("Test");

      await template.update({ gameFlags: { key1: "value1", key2: 123 } });

      expect(template.getParsedGameFlags()).toEqual({ key1: "value1", key2: 123 });
    });

    test("updates reactFlowData with JSON encoding", async () => {
      const template = await Template.create("Test");
      const newReactFlowData = {
        nodes: [{ id: "1", type: "test", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      await template.update({ reactFlowData: newReactFlowData });

      expect(template.getParsedReactFlowData()).toEqual(newReactFlowData);
    });

    test("throws error when reactFlowData validation fails", async () => {
      const template = await Template.create("Test");

      // Invalid reactFlowData (missing required fields)
      const invalidData = { nodes: [] } as unknown as Parameters<
        typeof template.update
      >[0]["reactFlowData"];

      expect(template.update({ reactFlowData: invalidData })).rejects.toThrow();
    });

    test("updates updatedAt timestamp", async () => {
      const template = await Template.create("Test");
      const originalUpdatedAt = template.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await template.update({ name: "Updated" });

      expect(template.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("getParsedGameFlags", () => {
    test("parses valid JSON successfully", async () => {
      const template = await Template.create("Test");
      await template.update({ gameFlags: { flag1: true, flag2: "test" } });

      const parsed = template.getParsedGameFlags();

      expect(parsed).toEqual({ flag1: true, flag2: "test" });
    });

    test("returns empty object for invalid JSON", async () => {
      const template = await Template.create("Test");

      // Manually set invalid JSON
      template.gameFlags = "invalid json {";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = template.getParsedGameFlags();
      consoleSpy.mockRestore();

      expect(parsed).toEqual({});
    });
  });

  describe("getParsedReactFlowData", () => {
    test("parses valid JSON successfully", async () => {
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

    test("returns defaultReactFlowData for invalid JSON", async () => {
      const template = await Template.create("Test");

      // Manually set invalid JSON
      template.reactFlowData = "not valid json";

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = template.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });

    test("returns defaultReactFlowData when validation fails", async () => {
      const template = await Template.create("Test");

      // Set JSON that parses but fails Zod validation
      template.reactFlowData = JSON.stringify({ nodes: "not an array" });

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
      const parsed = template.getParsedReactFlowData();
      consoleSpy.mockRestore();

      expect(parsed).toEqual(defaultReactFlowData);
    });
  });

  describe("import", () => {
    test("imports valid template with version 1", async () => {
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

    test("throws error for unsupported version", async () => {
      const exportData = {
        version: 2,
        name: "Test",
        gameFlags: {},
        reactFlowData: defaultReactFlowData,
      };

      expect(Template.import(exportData)).rejects.toThrow();
    });

    test("throws Zod error for invalid schema", async () => {
      const invalidData = {
        version: 1,
        // Missing required fields
      };

      expect(Template.import(invalidData)).rejects.toThrow();
    });

    test("throws error when name is empty", async () => {
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
    test("exports template with parsed data", async () => {
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
});
