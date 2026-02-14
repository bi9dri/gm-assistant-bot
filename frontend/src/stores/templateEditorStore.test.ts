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
});
