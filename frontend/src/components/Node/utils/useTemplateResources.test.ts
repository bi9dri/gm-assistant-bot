import type { Edge } from "@xyflow/react";

import { describe, test, expect } from "bun:test";

import type { FlowNode } from "@/stores/templateEditorStore";

import {
  buildIncomingEdgesMap,
  findPredecessorNodes,
  extractResourcesFromNode,
  mergeResources,
  collectResourcesBeforeNode,
  type TemplateResources,
} from "./useTemplateResources";

describe("buildIncomingEdgesMap", () => {
  test("空のエッジ配列から空のマップを返す", () => {
    const result = buildIncomingEdgesMap([]);
    expect(result.size).toBe(0);
  });

  test("単一エッジを正しくマッピングする", () => {
    const edges: Edge[] = [{ id: "e1", source: "node-1", target: "node-2" }];
    const result = buildIncomingEdgesMap(edges);
    expect(result.get("node-2")).toEqual(["node-1"]);
  });

  test("同じターゲットへの複数エッジを正しくマッピングする", () => {
    const edges: Edge[] = [
      { id: "e1", source: "node-1", target: "node-3" },
      { id: "e2", source: "node-2", target: "node-3" },
    ];
    const result = buildIncomingEdgesMap(edges);
    expect(result.get("node-3")).toEqual(["node-1", "node-2"]);
  });

  test("異なるターゲットへのエッジを別々にマッピングする", () => {
    const edges: Edge[] = [
      { id: "e1", source: "node-1", target: "node-2" },
      { id: "e2", source: "node-1", target: "node-3" },
    ];
    const result = buildIncomingEdgesMap(edges);
    expect(result.get("node-2")).toEqual(["node-1"]);
    expect(result.get("node-3")).toEqual(["node-1"]);
  });
});

describe("findPredecessorNodes", () => {
  test("先行ノードがない場合は空のSetを返す", () => {
    const result = findPredecessorNodes("node-1", new Map());
    expect(result.size).toBe(0);
  });

  test("直接の先行ノードを取得する", () => {
    const incomingMap = new Map([["node-2", ["node-1"]]]);
    const result = findPredecessorNodes("node-2", incomingMap);
    expect(result.has("node-1")).toBe(true);
    expect(result.size).toBe(1);
  });

  test("間接的な先行ノードも取得する（推移的閉包）", () => {
    const incomingMap = new Map([
      ["node-2", ["node-1"]],
      ["node-3", ["node-2"]],
    ]);
    const result = findPredecessorNodes("node-3", incomingMap);
    expect(result.has("node-1")).toBe(true);
    expect(result.has("node-2")).toBe(true);
    expect(result.size).toBe(2);
  });

  test("循環グラフでも無限ループしない", () => {
    const incomingMap = new Map([
      ["node-1", ["node-2"]],
      ["node-2", ["node-1"]],
    ]);
    const result = findPredecessorNodes("node-1", incomingMap);
    expect(result.has("node-2")).toBe(true);
    expect(result.has("node-1")).toBe(true);
  });

  test("複数の先行パスがある場合すべてのノードを取得する", () => {
    const incomingMap = new Map([
      ["node-4", ["node-2", "node-3"]],
      ["node-2", ["node-1"]],
      ["node-3", ["node-1"]],
    ]);
    const result = findPredecessorNodes("node-4", incomingMap);
    expect(result.has("node-1")).toBe(true);
    expect(result.has("node-2")).toBe(true);
    expect(result.has("node-3")).toBe(true);
    expect(result.size).toBe(3);
  });
});

describe("extractResourcesFromNode", () => {
  test("CreateRoleノードからロールを抽出する", () => {
    const node = {
      id: "node-1",
      type: "CreateRole",
      data: { roles: ["Role1", "Role2"] },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result.roles).toEqual([
      { name: "Role1", sourceNodeId: "node-1" },
      { name: "Role2", sourceNodeId: "node-1" },
    ]);
  });

  test("空のロール名はフィルタリングされる", () => {
    const node = {
      id: "node-1",
      type: "CreateRole",
      data: { roles: ["Role1", "", "  ", "Role2"] },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result.roles).toEqual([
      { name: "Role1", sourceNodeId: "node-1" },
      { name: "Role2", sourceNodeId: "node-1" },
    ]);
  });

  test("すべてのロールが空の場合は空オブジェクトを返す", () => {
    const node = {
      id: "node-1",
      type: "CreateRole",
      data: { roles: ["", "  "] },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result).toEqual({});
  });

  test("CreateChannelノードからチャンネルを抽出する", () => {
    const node = {
      id: "node-1",
      type: "CreateChannel",
      data: {
        channels: [
          { name: "general", type: "text" },
          { name: "voice-1", type: "voice" },
        ],
      },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result.channels).toEqual([
      { name: "general", type: "text", sourceNodeId: "node-1" },
      { name: "voice-1", type: "voice", sourceNodeId: "node-1" },
    ]);
  });

  test("空のチャンネル名はフィルタリングされる", () => {
    const node = {
      id: "node-1",
      type: "CreateChannel",
      data: {
        channels: [
          { name: "general", type: "text" },
          { name: "", type: "text" },
          { name: "  ", type: "voice" },
        ],
      },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result.channels).toEqual([{ name: "general", type: "text", sourceNodeId: "node-1" }]);
  });

  test("SetGameFlagノードからゲームフラグを抽出する", () => {
    const node = {
      id: "node-1",
      type: "SetGameFlag",
      data: { flagKey: "myFlag", flagValue: "value" },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result.gameFlags).toEqual([{ key: "myFlag", sourceNodeId: "node-1" }]);
  });

  test("空のflagKeyは抽出しない", () => {
    const node = {
      id: "node-1",
      type: "SetGameFlag",
      data: { flagKey: "  ", flagValue: "value" },
      position: { x: 0, y: 0 },
    } as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result).toEqual({});
  });

  test("未対応のノードタイプは空オブジェクトを返す", () => {
    const node = {
      id: "node-1",
      type: "Comment",
      data: { text: "test" },
      position: { x: 0, y: 0 },
    } as unknown as FlowNode;

    const result = extractResourcesFromNode(node);
    expect(result).toEqual({});
  });
});

describe("mergeResources", () => {
  test("rolesをマージする", () => {
    const base: TemplateResources = { roles: [], channels: [], gameFlags: [] };
    const partial = { roles: [{ name: "Role1", sourceNodeId: "n1" }] };

    mergeResources(base, partial);
    expect(base.roles).toEqual([{ name: "Role1", sourceNodeId: "n1" }]);
  });

  test("channelsをマージする", () => {
    const base: TemplateResources = { roles: [], channels: [], gameFlags: [] };
    const partial = { channels: [{ name: "general", type: "text" as const, sourceNodeId: "n1" }] };

    mergeResources(base, partial);
    expect(base.channels).toEqual([{ name: "general", type: "text", sourceNodeId: "n1" }]);
  });

  test("gameFlagsをマージする", () => {
    const base: TemplateResources = { roles: [], channels: [], gameFlags: [] };
    const partial = { gameFlags: [{ key: "flag1", sourceNodeId: "n1" }] };

    mergeResources(base, partial);
    expect(base.gameFlags).toEqual([{ key: "flag1", sourceNodeId: "n1" }]);
  });

  test("複数回マージできる", () => {
    const base: TemplateResources = { roles: [], channels: [], gameFlags: [] };

    mergeResources(base, { roles: [{ name: "Role1", sourceNodeId: "n1" }] });
    mergeResources(base, { roles: [{ name: "Role2", sourceNodeId: "n2" }] });

    expect(base.roles.length).toBe(2);
    expect(base.roles[0].name).toBe("Role1");
    expect(base.roles[1].name).toBe("Role2");
  });

  test("空のpartialは何も変更しない", () => {
    const base: TemplateResources = {
      roles: [{ name: "existing", sourceNodeId: "n1" }],
      channels: [],
      gameFlags: [],
    };

    mergeResources(base, {});
    expect(base.roles.length).toBe(1);
  });
});

describe("collectResourcesBeforeNode", () => {
  test("先行ノードからのみリソースを収集する", () => {
    const nodes: FlowNode[] = [
      {
        id: "role-1",
        type: "CreateRole",
        data: { roles: ["Admin"] },
        position: { x: 0, y: 0 },
      },
      {
        id: "role-2",
        type: "CreateRole",
        data: { roles: ["User"] },
        position: { x: 0, y: 100 },
      },
      {
        id: "channel-1",
        type: "CreateChannel",
        data: { channels: [] },
        position: { x: 0, y: 200 },
      },
    ] as FlowNode[];

    const edges: Edge[] = [{ id: "e1", source: "role-1", target: "channel-1" }];

    const result = collectResourcesBeforeNode("channel-1", nodes, edges);

    expect(result.roles).toEqual([{ name: "Admin", sourceNodeId: "role-1" }]);
    expect(result.roles.find((r) => r.name === "User")).toBeUndefined();
  });

  test("エッジがない場合は空のリソースを返す", () => {
    const nodes: FlowNode[] = [
      {
        id: "role-1",
        type: "CreateRole",
        data: { roles: ["Admin"] },
        position: { x: 0, y: 0 },
      },
    ] as FlowNode[];

    const result = collectResourcesBeforeNode("role-1", nodes, []);

    expect(result.roles).toEqual([]);
    expect(result.channels).toEqual([]);
    expect(result.gameFlags).toEqual([]);
  });

  test("推移的に先行ノードを収集する", () => {
    const nodes: FlowNode[] = [
      {
        id: "flag-1",
        type: "SetGameFlag",
        data: { flagKey: "started", flagValue: "1" },
        position: { x: 0, y: 0 },
      },
      {
        id: "role-1",
        type: "CreateRole",
        data: { roles: ["Admin"] },
        position: { x: 0, y: 100 },
      },
      {
        id: "channel-1",
        type: "CreateChannel",
        data: { channels: [] },
        position: { x: 0, y: 200 },
      },
    ] as FlowNode[];

    const edges: Edge[] = [
      { id: "e1", source: "flag-1", target: "role-1" },
      { id: "e2", source: "role-1", target: "channel-1" },
    ];

    const result = collectResourcesBeforeNode("channel-1", nodes, edges);

    expect(result.roles).toEqual([{ name: "Admin", sourceNodeId: "role-1" }]);
    expect(result.gameFlags).toEqual([{ key: "started", sourceNodeId: "flag-1" }]);
  });

  test("複数の先行パスから全てのリソースを収集する", () => {
    const nodes: FlowNode[] = [
      {
        id: "role-1",
        type: "CreateRole",
        data: { roles: ["Admin"] },
        position: { x: 0, y: 0 },
      },
      {
        id: "role-2",
        type: "CreateRole",
        data: { roles: ["User"] },
        position: { x: 100, y: 0 },
      },
      {
        id: "target",
        type: "CreateChannel",
        data: { channels: [] },
        position: { x: 50, y: 100 },
      },
    ] as FlowNode[];

    const edges: Edge[] = [
      { id: "e1", source: "role-1", target: "target" },
      { id: "e2", source: "role-2", target: "target" },
    ];

    const result = collectResourcesBeforeNode("target", nodes, edges);

    expect(result.roles.length).toBe(2);
    expect(result.roles.find((r) => r.name === "Admin")).toBeDefined();
    expect(result.roles.find((r) => r.name === "User")).toBeDefined();
  });
});
