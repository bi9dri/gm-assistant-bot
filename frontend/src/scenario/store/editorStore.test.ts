import { beforeEach, describe, expect, test } from "bun:test";

import type { Step } from "@/flow/schema";

import { useScenarioEditorStore } from "./editorStore";

const root = { kind: "root" as const };

const text = (id: string): Step => ({
  id,
  type: "Text",
  title: "本文",
  memo: "",
  autoAdvance: false,
  body: "",
});

const branchWithChild = (): Step => ({
  id: "br",
  type: "Branch",
  title: "分岐",
  memo: "",
  autoAdvance: false,
  mode: "select",
  matchMode: "first",
  flagName: "vote",
  branches: [
    {
      id: "arm1",
      label: "枝",
      steps: [{ id: "child", type: "Text", title: "本文", memo: "", autoAdvance: false, body: "" }],
    },
  ],
});

describe("scenario editorStore", () => {
  beforeEach(() => {
    useScenarioEditorStore.setState({
      blocks: [],
      gameFlags: {},
      selectedBlockId: null,
      initialized: true,
    });
  });

  test("addBlock は registry の defaults で採番して挿入し選択する", () => {
    useScenarioEditorStore.getState().addBlock("Text", { container: root, index: 0 });
    const { blocks, selectedBlockId } = useScenarioEditorStore.getState();

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("Text");
    expect(selectedBlockId).toBe(blocks[0]!.id);
  });

  test("addBlock は未知のタイプを無視する", () => {
    useScenarioEditorStore.getState().addBlock("Nope" as never, { container: root, index: 0 });

    expect(useScenarioEditorStore.getState().blocks).toHaveLength(0);
  });

  test("updateBlock はフィールドを浅くマージする", () => {
    useScenarioEditorStore.getState().addBlock("Heading", { container: root, index: 0 });
    const id = useScenarioEditorStore.getState().selectedBlockId ?? "";
    useScenarioEditorStore.getState().updateBlock(id, { title: "第 1 章" });

    expect(useScenarioEditorStore.getState().blocks[0]?.title).toBe("第 1 章");
  });

  test("removeBlock は枝ごと消えた選択を外す", () => {
    useScenarioEditorStore.setState({
      blocks: [branchWithChild(), text("keep")],
      selectedBlockId: "child",
    });
    useScenarioEditorStore.getState().removeBlock("br");

    expect(useScenarioEditorStore.getState().blocks.map((block) => block.id)).toEqual(["keep"]);
    expect(useScenarioEditorStore.getState().selectedBlockId).toBeNull();
  });

  test("removeBlock は残っている選択を保つ", () => {
    useScenarioEditorStore.setState({ blocks: [branchWithChild()], selectedBlockId: "child" });
    useScenarioEditorStore.getState().addBlock("Text", { container: root, index: 0 });
    const added = useScenarioEditorStore.getState().selectedBlockId ?? "";
    useScenarioEditorStore.setState({ selectedBlockId: "child" });
    useScenarioEditorStore.getState().removeBlock(added);

    expect(useScenarioEditorStore.getState().selectedBlockId).toBe("child");
  });

  test("removeBlock は最後の 1 ブロックを消しても空にしない", () => {
    useScenarioEditorStore.getState().addBlock("Text", { container: root, index: 0 });
    const id = useScenarioEditorStore.getState().selectedBlockId ?? "";
    useScenarioEditorStore.getState().removeBlock(id);
    const { blocks } = useScenarioEditorStore.getState();

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("Text");
    expect(blocks[0]?.id).not.toBe(id);
  });

  test("addBlock は畳まれた見出しの中に追加したらその見出しを開く", () => {
    useScenarioEditorStore.setState({
      blocks: [
        {
          id: "h1",
          type: "Heading",
          title: "章",
          memo: "",
          autoAdvance: false,
          level: 1,
          collapsed: true,
        },
      ],
    });
    useScenarioEditorStore.getState().addBlock("Text", { container: root, index: 1 });
    const heading = useScenarioEditorStore.getState().blocks[0];

    expect(heading?.type === "Heading" && heading.collapsed).toBe(false);
  });

  test("insertTextBlocks は本文を順番どおりに本文ブロックとして挿入する", () => {
    useScenarioEditorStore.setState({ blocks: [text("head")] });
    useScenarioEditorStore.getState().insertTextBlocks(["一段落目", "二段落目"], {
      container: root,
      index: 1,
    });
    const { blocks } = useScenarioEditorStore.getState();

    expect(blocks.map((block) => block.type)).toEqual(["Text", "Text", "Text"]);
    expect(blocks.map((block) => (block.type === "Text" ? block.body : ""))).toEqual([
      "",
      "一段落目",
      "二段落目",
    ]);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(3);
  });

  test("insertTextBlocks は畳まれた見出しの中に取り込んだらその見出しを開く", () => {
    useScenarioEditorStore.setState({
      blocks: [
        {
          id: "h1",
          type: "Heading",
          title: "章",
          memo: "",
          autoAdvance: false,
          level: 1,
          collapsed: true,
        },
      ],
    });
    useScenarioEditorStore.getState().insertTextBlocks(["本文"], { container: root, index: 1 });
    const heading = useScenarioEditorStore.getState().blocks[0];

    expect(heading?.type === "Heading" && heading.collapsed).toBe(false);
  });

  test("duplicateBlock は複製を選択する", () => {
    useScenarioEditorStore.setState({ blocks: [branchWithChild()] });
    useScenarioEditorStore.getState().duplicateBlock("br");
    const { blocks, selectedBlockId } = useScenarioEditorStore.getState();

    expect(blocks).toHaveLength(2);
    expect(selectedBlockId).toBe(blocks[1]!.id);
  });

  test("initialize は編集状態を入れ替えて選択を外す", () => {
    useScenarioEditorStore.setState({ selectedBlockId: "child" });
    useScenarioEditorStore.getState().initialize([branchWithChild()], { phase: "day" });
    const state = useScenarioEditorStore.getState();

    expect(state.initialized).toBe(true);
    expect(state.gameFlags).toEqual({ phase: "day" });
    expect(state.selectedBlockId).toBeNull();
  });

  test("selectBlock は選択を切り替える", () => {
    useScenarioEditorStore.getState().selectBlock("child");
    expect(useScenarioEditorStore.getState().selectedBlockId).toBe("child");

    useScenarioEditorStore.getState().selectBlock(null);
    expect(useScenarioEditorStore.getState().selectedBlockId).toBeNull();
  });

  test("moveBlock は枝を跨いで移動する", () => {
    useScenarioEditorStore.setState({ blocks: [branchWithChild()] });
    useScenarioEditorStore.getState().moveBlock("child", { container: root, index: 0 });
    const { blocks } = useScenarioEditorStore.getState();

    expect(blocks.map((block) => block.id)).toEqual(["child", "br"]);
  });

  test("restoreBlocks はスナップショットへ差し戻す", () => {
    const snapshot = [branchWithChild()];
    useScenarioEditorStore.getState().addBlock("Text", { container: root, index: 0 });
    useScenarioEditorStore.getState().restoreBlocks(snapshot);

    expect(useScenarioEditorStore.getState().blocks).toBe(snapshot);
  });

  test("ゲームフラグを追加・削除できる", () => {
    useScenarioEditorStore.getState().setGameFlag("phase", "day");
    expect(useScenarioEditorStore.getState().gameFlags).toEqual({ phase: "day" });

    useScenarioEditorStore.getState().removeGameFlag("phase");
    expect(useScenarioEditorStore.getState().gameFlags).toEqual({});
  });
});
