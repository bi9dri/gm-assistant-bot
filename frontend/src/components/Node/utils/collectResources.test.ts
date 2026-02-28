import type { Edge } from "@xyflow/react";

import { describe, expect, it } from "bun:test";

import type { FlowNode } from "@/stores/templateEditorStore";

import { collectResourcesBeforeNode } from "./collectResources";

const makeNode = (id: string, type: string, data: Record<string, unknown>) =>
  ({ id, type, data, position: { x: 0, y: 0 } }) as unknown as FlowNode;

const makeEdge = (source: string, target: string): Edge =>
  ({ id: `${source}->${target}`, source, target }) as Edge;

describe("collectResourcesBeforeNode", () => {
  describe("gameFlags - SetGameFlagNode", () => {
    it("SetGameFlagNode から key と values を収集する", () => {
      const nodes = [
        makeNode("flag-1", "SetGameFlag", { flagKey: "team", flagValue: "blue" }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("flag-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([{ key: "team", values: ["blue"], sourceNodeId: "flag-1" }]);
    });

    it("flagValue が空の場合は values が空配列になる", () => {
      const nodes = [
        makeNode("flag-1", "SetGameFlag", { flagKey: "team", flagValue: "" }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("flag-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([{ key: "team", values: [], sourceNodeId: "flag-1" }]);
    });

    it("flagKey が空文字の場合はスキップする", () => {
      const nodes = [
        makeNode("flag-1", "SetGameFlag", { flagKey: "", flagValue: "blue" }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("flag-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
    });

    it("flagKey がスペースのみの場合はスキップする", () => {
      const nodes = [
        makeNode("flag-1", "SetGameFlag", { flagKey: "   ", flagValue: "blue" }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("flag-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
    });
  });

  describe("gameFlags - SelectBranchNode", () => {
    it("SelectBranchNode から flagName と option labels を収集する", () => {
      const nodes = [
        makeNode("branch-1", "SelectBranch", {
          flagName: "selectedCriminal",
          options: [
            { id: "1", label: "犯人A" },
            { id: "2", label: "犯人B" },
            { id: "3", label: "犯人C" },
          ],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("branch-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([
        {
          key: "selectedCriminal",
          values: ["犯人A", "犯人B", "犯人C"],
          sourceNodeId: "branch-1",
        },
      ]);
    });

    it("空ラベルの option はフィルタされる", () => {
      const nodes = [
        makeNode("branch-1", "SelectBranch", {
          flagName: "choice",
          options: [
            { id: "1", label: "A" },
            { id: "2", label: "" },
            { id: "3", label: "C" },
          ],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("branch-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([
        { key: "choice", values: ["A", "C"], sourceNodeId: "branch-1" },
      ]);
    });

    it("flagName が空文字の場合はスキップする", () => {
      const nodes = [
        makeNode("branch-1", "SelectBranch", {
          flagName: "",
          options: [{ id: "1", label: "A" }],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("branch-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
    });
  });

  describe("gameFlags - ShuffleAssignNode", () => {
    it("ShuffleAssignNode から動的キーと items を収集する", () => {
      const nodes = [
        makeNode("shuffle-1", "ShuffleAssign", {
          resultFlagPrefix: "role",
          targets: ["Alice", "Bob"],
          items: ["Detective", "Killer"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("shuffle-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([
        { key: "role_Alice", values: ["Detective", "Killer"], sourceNodeId: "shuffle-1" },
        { key: "role_Bob", values: ["Detective", "Killer"], sourceNodeId: "shuffle-1" },
      ]);
    });

    it("resultFlagPrefix が空文字の場合はスキップする", () => {
      const nodes = [
        makeNode("shuffle-1", "ShuffleAssign", {
          resultFlagPrefix: "",
          targets: ["Alice"],
          items: ["Detective"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("shuffle-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
    });

    it("空文字の target はスキップする", () => {
      const nodes = [
        makeNode("shuffle-1", "ShuffleAssign", {
          resultFlagPrefix: "role",
          targets: ["Alice", "", "Carol"],
          items: ["Detective"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("shuffle-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toHaveLength(2);
      expect(result.gameFlags.map((f) => f.key)).toEqual(["role_Alice", "role_Carol"]);
    });

    it("空文字の items はフィルタされる", () => {
      const nodes = [
        makeNode("shuffle-1", "ShuffleAssign", {
          resultFlagPrefix: "role",
          targets: ["Alice"],
          items: ["Detective", "", "Killer"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("shuffle-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags[0].values).toEqual(["Detective", "Killer"]);
    });
  });

  describe("gameFlags - RandomSelectNode", () => {
    it("RandomSelectNode から resultFlagKey と items を収集する", () => {
      const nodes = [
        makeNode("random-1", "RandomSelect", {
          resultFlagKey: "犯人",
          items: ["Alice", "Bob", "Carol"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("random-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([
        { key: "犯人", values: ["Alice", "Bob", "Carol"], sourceNodeId: "random-1" },
      ]);
    });

    it("resultFlagKey が空文字の場合はスキップする", () => {
      const nodes = [
        makeNode("random-1", "RandomSelect", {
          resultFlagKey: "",
          items: ["Alice"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("random-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
    });

    it("resultFlagKey がスペースのみの場合はスキップする", () => {
      const nodes = [
        makeNode("random-1", "RandomSelect", {
          resultFlagKey: "   ",
          items: ["Alice"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("random-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
    });

    it("空文字の items はフィルタされる", () => {
      const nodes = [
        makeNode("random-1", "RandomSelect", {
          resultFlagKey: "犯人",
          items: ["Alice", "", "Carol"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("random-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags[0].values).toEqual(["Alice", "Carol"]);
    });
  });

  describe("混在ケース", () => {
    it("3種のノードが混在する場合にすべて収集する", () => {
      const nodes = [
        makeNode("flag-1", "SetGameFlag", { flagKey: "phase", flagValue: "start" }),
        makeNode("branch-1", "SelectBranch", {
          flagName: "team",
          options: [
            { id: "1", label: "red" },
            { id: "2", label: "blue" },
          ],
        }),
        makeNode("shuffle-1", "ShuffleAssign", {
          resultFlagPrefix: "role",
          targets: ["Alice"],
          items: ["Detective"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [
        makeEdge("flag-1", "target"),
        makeEdge("branch-1", "target"),
        makeEdge("shuffle-1", "target"),
      ];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toHaveLength(3);
      expect(result.gameFlags.map((f) => f.key)).toEqual(["phase", "team", "role_Alice"]);
    });

    it("4種のノードが混在する場合にすべて収集する", () => {
      const nodes = [
        makeNode("flag-1", "SetGameFlag", { flagKey: "phase", flagValue: "start" }),
        makeNode("branch-1", "SelectBranch", {
          flagName: "team",
          options: [{ id: "1", label: "red" }],
        }),
        makeNode("shuffle-1", "ShuffleAssign", {
          resultFlagPrefix: "role",
          targets: ["Alice"],
          items: ["Detective"],
        }),
        makeNode("random-1", "RandomSelect", {
          resultFlagKey: "犯人",
          items: ["Alice", "Bob"],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [
        makeEdge("flag-1", "target"),
        makeEdge("branch-1", "target"),
        makeEdge("shuffle-1", "target"),
        makeEdge("random-1", "target"),
      ];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toHaveLength(4);
      expect(result.gameFlags.map((f) => f.key)).toEqual(["phase", "team", "role_Alice", "犯人"]);
    });
  });

  describe("上流ノードなし", () => {
    it("上流ノードがない場合は空配列を返す", () => {
      const nodes = [makeNode("target", "ConditionalBranch", {})];
      const edges: Edge[] = [];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.gameFlags).toEqual([]);
      expect(result.roles).toEqual([]);
      expect(result.channels).toEqual([]);
    });
  });

  describe("ロールとチャンネルの収集（既存動作の確認）", () => {
    it("CreateRoleNode からロールを収集する", () => {
      const nodes = [
        makeNode("role-1", "CreateRole", { roles: ["探偵", "犯人", ""] }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("role-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.roles).toEqual([
        { name: "探偵", sourceNodeId: "role-1" },
        { name: "犯人", sourceNodeId: "role-1" },
      ]);
    });

    it("CreateChannelNode からチャンネルを収集する", () => {
      const nodes = [
        makeNode("ch-1", "CreateChannel", {
          channels: [
            { name: "general", type: "text" },
            { name: "voice-room", type: "voice" },
          ],
        }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      const edges = [makeEdge("ch-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.channels).toEqual([
        { name: "general", type: "text", sourceNodeId: "ch-1" },
        { name: "voice-room", type: "voice", sourceNodeId: "ch-1" },
      ]);
    });

    it("上流でないノードのリソースは含まれない", () => {
      const nodes = [
        makeNode("role-1", "CreateRole", { roles: ["探偵"] }),
        makeNode("role-2", "CreateRole", { roles: ["犯人"] }),
        makeNode("target", "ConditionalBranch", {}),
      ];
      // role-2 is not connected to target
      const edges = [makeEdge("role-1", "target")];

      const result = collectResourcesBeforeNode("target", nodes, edges);

      expect(result.roles).toEqual([{ name: "探偵", sourceNodeId: "role-1" }]);
    });
  });
});
