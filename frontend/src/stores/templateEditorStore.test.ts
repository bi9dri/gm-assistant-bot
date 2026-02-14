import { describe, test, expect, beforeEach } from "bun:test";

import { useTemplateEditorStore } from "./templateEditorStore";

describe("templateEditorStore", () => {
  beforeEach(() => {
    useTemplateEditorStore.getState().reset();
  });

  describe("addNode", () => {
    const position = { x: 100, y: 200 };

    test("CreateCategoryノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("CreateCategory", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("CreateCategory");
      expect(node.data).toEqual({ categoryName: { type: "literal", value: "" } });
      expect(node.position).toEqual(position);
    });

    test("CreateRoleノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("CreateRole");
      expect(node.data).toEqual({ roles: [""] });
    });

    test("CreateChannelノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("CreateChannel", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("CreateChannel");
      expect(node.data).toEqual({ channels: [] });
    });

    test("DeleteCategoryノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("DeleteCategory", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("DeleteCategory");
      expect(node.data).toEqual({});
    });

    test("DeleteRoleノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("DeleteRole", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("DeleteRole");
      expect(node.data).toEqual({ deleteAll: false, roleNames: [""] });
    });

    test("DeleteChannelノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("DeleteChannel", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("DeleteChannel");
      expect(node.data).toEqual({ channelNames: [""] });
    });

    test("ChangeChannelPermissionノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("ChangeChannelPermission", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("ChangeChannelPermission");
      expect(node.data).toEqual({ channelName: "", rolePermissions: [] });
    });

    test("SendMessageノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("SendMessage", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("SendMessage");
      expect(node.data).toEqual({
        channelNames: [""],
        messages: [{ content: "", attachments: [] }],
      });
    });

    test("AddRoleToRoleMembersノードは正しい初期データを持つ", () => {
      useTemplateEditorStore.getState().addNode("AddRoleToRoleMembers", position);

      const node = useTemplateEditorStore.getState().nodes[0];
      expect(node.type).toBe("AddRoleToRoleMembers");
      expect(node.data).toEqual({ memberRoleName: "", addRoleName: "" });
    });
  });

  describe("duplicateNode", () => {
    test("ノードをディープコピーで複製する", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });

      const originalNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore
        .getState()
        .updateNodeData(originalNode.id, { roles: ["Role1", "Role2"] });

      useTemplateEditorStore.getState().duplicateNode(originalNode.id);

      const nodes = useTemplateEditorStore.getState().nodes;
      expect(nodes.length).toBe(2);

      const duplicatedNode = nodes[1];
      expect(duplicatedNode.id).not.toBe(originalNode.id);
      expect(duplicatedNode.type).toBe(originalNode.type);
      expect(duplicatedNode.data).toEqual({ roles: ["Role1", "Role2"] });

      // ディープコピーであることを確認（参照ではない）
      expect(duplicatedNode.data).not.toBe(originalNode.data);
    });

    test("複製されたノードの位置は+50, +50オフセットされる", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 200 });

      const originalNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().duplicateNode(originalNode.id);

      const duplicatedNode = useTemplateEditorStore.getState().nodes[1];
      expect(duplicatedNode.position).toEqual({ x: 150, y: 250 });
    });

    test("複製されたノードはselected: falseおよびdragging: falseを持つ", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });

      const originalNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().duplicateNode(originalNode.id);

      const duplicatedNode = useTemplateEditorStore.getState().nodes[1];
      expect(duplicatedNode.selected).toBe(false);
      expect(duplicatedNode.dragging).toBe(false);
    });

    test("ノードが見つからない場合は何もしない", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });

      useTemplateEditorStore.getState().duplicateNode("non-existent-id");

      expect(useTemplateEditorStore.getState().nodes.length).toBe(1);
    });
  });

  describe("deleteNode", () => {
    test("ノード配列からノードを削除する", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });
      useTemplateEditorStore.getState().addNode("CreateChannel", { x: 200, y: 200 });

      const nodeToDelete = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().deleteNode(nodeToDelete.id);

      const nodes = useTemplateEditorStore.getState().nodes;
      expect(nodes.length).toBe(1);
      expect(nodes[0].type).toBe("CreateChannel");
    });

    test("ソースノードが削除されたとき関連するエッジも削除される", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });
      useTemplateEditorStore.getState().addNode("CreateChannel", { x: 200, y: 200 });

      const nodes = useTemplateEditorStore.getState().nodes;
      const sourceNode = nodes[0];
      const targetNode = nodes[1];

      useTemplateEditorStore.getState().onConnect({
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: null,
        targetHandle: null,
      });

      expect(useTemplateEditorStore.getState().edges.length).toBe(1);

      useTemplateEditorStore.getState().deleteNode(sourceNode.id);

      expect(useTemplateEditorStore.getState().edges.length).toBe(0);
    });

    test("ターゲットノードが削除されたとき関連するエッジも削除される", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });
      useTemplateEditorStore.getState().addNode("CreateChannel", { x: 200, y: 200 });

      const nodes = useTemplateEditorStore.getState().nodes;
      const sourceNode = nodes[0];
      const targetNode = nodes[1];

      useTemplateEditorStore.getState().onConnect({
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: null,
        targetHandle: null,
      });

      expect(useTemplateEditorStore.getState().edges.length).toBe(1);

      useTemplateEditorStore.getState().deleteNode(targetNode.id);

      expect(useTemplateEditorStore.getState().edges.length).toBe(0);
    });
  });

  describe("updateNodeData", () => {
    test("ノードデータをマージして更新する", () => {
      useTemplateEditorStore.getState().addNode("ChangeChannelPermission", { x: 100, y: 100 });

      const node = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(node.id, { channelName: "general" });

      const updatedNode = useTemplateEditorStore.getState().nodes[0];
      expect(updatedNode.data).toEqual({
        channelName: "general",
        rolePermissions: [],
      });
    });

    test("他のノードに影響しない", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 200, y: 200 });

      const firstNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(firstNode.id, { roles: ["Admin"] });

      const nodes = useTemplateEditorStore.getState().nodes;
      expect(nodes[0].data).toEqual({ roles: ["Admin"] });
      expect(nodes[1].data).toEqual({ roles: [""] });
    });
  });

  describe("expandBlueprint", () => {
    test("blueprintノードを削除し、生成されたノードに置き換える", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice", "Bob"],
          voiceChannelCount: 1,
          categoryName: "Game Category",
          sharedTextChannels: ["general"],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const nodes = useTemplateEditorStore.getState().nodes;
      const blueprintExists = nodes.some((n) => n.id === blueprintNode.id);
      expect(blueprintExists).toBe(false);

      expect(nodes.length).toBeGreaterThan(0);
    });

    test("キャラクター名に基づいてCreateRoleノードを生成する", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice", "Bob"],
          voiceChannelCount: 0,
          categoryName: "",
          sharedTextChannels: [],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const roleNode = useTemplateEditorStore.getState().nodes.find((n) => n.type === "CreateRole");
      expect(roleNode).toBeDefined();
      expect(roleNode?.data).toEqual({
        roles: ["PL", "観戦", "Alice", "Bob"],
      });
    });

    test("カテゴリ名が提供されている場合CreateCategoryノードを生成する", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice"],
          voiceChannelCount: 0,
          categoryName: "Game Category",
          sharedTextChannels: [],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const categoryNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "CreateCategory");
      expect(categoryNode).toBeDefined();
      expect(categoryNode?.data).toEqual({
        categoryName: { type: "literal", value: "Game Category" },
      });
    });

    test("カテゴリ名が空の場合CreateCategoryノードを生成しない", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice"],
          voiceChannelCount: 0,
          categoryName: "",
          sharedTextChannels: [],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const categoryNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "CreateCategory");
      expect(categoryNode).toBeUndefined();
    });

    test("共有テキストチャンネルとキャラクター固有チャンネルを含むCreateChannelノードを生成する", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice"],
          voiceChannelCount: 1,
          categoryName: "",
          sharedTextChannels: ["general"],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const channelNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "CreateChannel");
      expect(channelNode).toBeDefined();

      const channels = channelNode?.data.channels;
      expect(channels).toBeDefined();
      expect(channels?.length).toBeGreaterThan(0);

      const generalChannel = channels?.find((c) => c.name === "general");
      expect(generalChannel).toBeDefined();
      expect(generalChannel?.type).toBe("text");

      const aliceChannel = channels?.find((c) => c.name === "Alice");
      expect(aliceChannel).toBeDefined();
      expect(aliceChannel?.type).toBe("text");

      const voiceChannel = channels?.find((c) => c.name === "VC-1");
      expect(voiceChannel).toBeDefined();
      expect(voiceChannel?.type).toBe("voice");
    });

    test("AddRoleToRoleMembersノードを生成する（PL→観戦）", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: [],
          voiceChannelCount: 0,
          categoryName: "",
          sharedTextChannels: [],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const addRoleNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "AddRoleToRoleMembers");
      expect(addRoleNode).toBeDefined();
      expect(addRoleNode?.data).toEqual({
        memberRoleName: "PL",
        addRoleName: "観戦",
      });
    });

    test("DeleteCategoryノードとDeleteRoleノードを生成する", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: [],
          voiceChannelCount: 0,
          categoryName: "",
          sharedTextChannels: [],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const deleteCategoryNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "DeleteCategory");
      expect(deleteCategoryNode).toBeDefined();

      const deleteRoleNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "DeleteRole");
      expect(deleteRoleNode).toBeDefined();
      expect(deleteRoleNode?.data).toEqual({
        deleteAll: true,
        roleNames: [],
      });
    });

    test("生成されたノード間にエッジを作成する", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice"],
          voiceChannelCount: 0,
          categoryName: "Game",
          sharedTextChannels: [],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const edges = useTemplateEditorStore.getState().edges;
      expect(edges.length).toBeGreaterThan(0);

      edges.forEach((edge) => {
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
        expect(edge.sourceHandle).toBe("source-1");
        expect(edge.targetHandle).toBe("target-1");
      });
    });

    test("空のキャラクター名と空の共有チャンネルはフィルタされる", () => {
      const position = { x: 100, y: 100 };
      useTemplateEditorStore.getState().addNode("Blueprint", position);

      const blueprintNode = useTemplateEditorStore.getState().nodes[0];
      useTemplateEditorStore.getState().updateNodeData(blueprintNode.id, {
        parameters: {
          characterNames: ["Alice", "", "Bob", "  "],
          voiceChannelCount: 0,
          categoryName: "",
          sharedTextChannels: ["general", "", "  "],
        },
      });

      useTemplateEditorStore.getState().expandBlueprint(blueprintNode.id);

      const roleNode = useTemplateEditorStore.getState().nodes.find((n) => n.type === "CreateRole");
      expect(roleNode?.data.roles).toEqual(["PL", "観戦", "Alice", "Bob"]);

      const channelNode = useTemplateEditorStore
        .getState()
        .nodes.find((n) => n.type === "CreateChannel");
      const generalChannel = channelNode?.data.channels?.find((c) => c.name === "general");
      expect(generalChannel).toBeDefined();

      const emptyChannel = channelNode?.data.channels?.find((c) => c.name === "");
      expect(emptyChannel).toBeUndefined();
    });

    test("blueprintノードが存在しない場合は何もしない", () => {
      const originalNodes = useTemplateEditorStore.getState().nodes;
      const originalEdges = useTemplateEditorStore.getState().edges;

      useTemplateEditorStore.getState().expandBlueprint("non-existent-id");

      expect(useTemplateEditorStore.getState().nodes).toEqual(originalNodes);
      expect(useTemplateEditorStore.getState().edges).toEqual(originalEdges);
    });

    test("blueprintではないノードの場合は何もしない", () => {
      useTemplateEditorStore.getState().addNode("CreateRole", { x: 100, y: 100 });

      const roleNode = useTemplateEditorStore.getState().nodes[0];
      const originalNodes = useTemplateEditorStore.getState().nodes;
      const originalEdges = useTemplateEditorStore.getState().edges;

      useTemplateEditorStore.getState().expandBlueprint(roleNode.id);

      expect(useTemplateEditorStore.getState().nodes).toEqual(originalNodes);
      expect(useTemplateEditorStore.getState().edges).toEqual(originalEdges);
    });
  });
});
