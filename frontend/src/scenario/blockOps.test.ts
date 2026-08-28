import { describe, expect, test } from "bun:test";

import type { Step } from "@/flow/schema";

import {
  duplicateBlock,
  sameBlockContainer,
  insertBlock,
  moveBlock,
  removeBlock,
  updateBlockById,
  type BlockContainer,
} from "./blockOps";

const text = (id: string, body = ""): Step => ({
  id,
  type: "Text",
  title: "本文",
  memo: "",
  autoAdvance: false,
  body,
});

const heading = (id: string, level: number): Step => ({
  id,
  type: "Heading",
  title: id,
  memo: "",
  autoAdvance: false,
  level,
  collapsed: false,
});

const branch = (id: string, armId: string, steps: Step[] = []): Step => ({
  id,
  type: "Branch",
  title: "分岐",
  memo: "",
  autoAdvance: false,
  mode: "select",
  matchMode: "first",
  flagName: "vote",
  branches: [{ id: armId, label: "枝", steps }],
});

const root: BlockContainer = { kind: "root" };
const arm = (branchStepId: string, armId: string): BlockContainer => ({
  kind: "branchArm",
  branchStepId,
  armId,
});

const ids = (blocks: Step[]): string[] => blocks.map((block) => block.id);

describe("insertBlock", () => {
  test("ルート列の指定位置に挿入する", () => {
    const blocks = insertBlock([text("a"), text("b")], { container: root, index: 1 }, text("x"));

    expect(ids(blocks)).toEqual(["a", "x", "b"]);
  });

  test("範囲外の index は末尾に丸める", () => {
    const blocks = insertBlock([text("a")], { container: root, index: 99 }, text("x"));

    expect(ids(blocks)).toEqual(["a", "x"]);
  });

  test("Branch アームの中に挿入する", () => {
    const blocks = insertBlock(
      [branch("br", "arm1")],
      { container: arm("br", "arm1"), index: 0 },
      text("x"),
    );

    expect(blocks[0]?.type === "Branch" && ids(blocks[0].branches[0]!.steps)).toEqual(["x"]);
  });

  test("存在しないアームへの挿入は何もしない", () => {
    const before = [branch("br", "arm1")];
    const blocks = insertBlock(before, { container: arm("br", "nope"), index: 0 }, text("x"));

    expect(blocks).toBe(before);
  });
});

describe("removeBlock", () => {
  test("ルート列から削除する", () => {
    expect(ids(removeBlock([text("a"), text("b")], "a"))).toEqual(["b"]);
  });

  test("Branch アームの中から削除する", () => {
    const blocks = removeBlock([branch("br", "arm1", [text("x")])], "x");

    expect(blocks[0]?.type === "Branch" && blocks[0].branches[0]?.steps).toEqual([]);
  });
});

describe("moveBlock", () => {
  test("ルート列内で並べ替える", () => {
    const blocks = moveBlock([text("a"), text("b"), text("c")], "c", {
      container: root,
      index: 0,
    });

    expect(ids(blocks)).toEqual(["c", "a", "b"]);
  });

  test("ルートから Branch アームへ移動する", () => {
    const blocks = moveBlock([text("a"), branch("br", "arm1")], "a", {
      container: arm("br", "arm1"),
      index: 0,
    });

    expect(ids(blocks)).toEqual(["br"]);
    expect(blocks[0]?.type === "Branch" && ids(blocks[0].branches[0]!.steps)).toEqual(["a"]);
  });

  test("Branch アームからルートへ移動する", () => {
    const blocks = moveBlock([branch("br", "arm1", [text("x")])], "x", {
      container: root,
      index: 0,
    });

    expect(ids(blocks)).toEqual(["x", "br"]);
    expect(blocks[1]?.type === "Branch" && blocks[1].branches[0]?.steps).toEqual([]);
  });

  test("自分自身のアームへは移動しない", () => {
    const before = [branch("br", "arm1")];
    const blocks = moveBlock(before, "br", { container: arm("br", "arm1"), index: 0 });

    expect(blocks).toBe(before);
  });

  test("子孫 Branch のアームへは移動しない", () => {
    const before = [branch("outer", "arm1", [branch("inner", "arm2")])];
    const blocks = moveBlock(before, "outer", { container: arm("inner", "arm2"), index: 0 });

    expect(blocks).toBe(before);
  });
});

describe("duplicateBlock", () => {
  test("直後に複製し、入れ子の id も採番し直す", () => {
    const { blocks, newBlock } = duplicateBlock(
      [branch("br", "arm1", [text("x")]), text("z")],
      "br",
    );

    expect(newBlock).toBeDefined();
    expect(ids(blocks)).toEqual(["br", newBlock!.id, "z"]);
    expect(newBlock!.id).not.toBe("br");
    const copiedArm = newBlock!.type === "Branch" ? newBlock!.branches[0] : undefined;
    expect(copiedArm?.id).not.toBe("arm1");
    expect(copiedArm?.steps[0]?.id).not.toBe("x");
  });

  test("見出しは配下のブロックの後ろに複製する", () => {
    // 直後に置くと、元の見出しが束ねていたブロックが複製側にぶら下がってしまう。
    const { blocks, newBlock } = duplicateBlock(
      [heading("h1", 1), text("a"), text("b"), heading("h2", 1)],
      "h1",
    );

    expect(ids(blocks)).toEqual(["h1", "a", "b", newBlock!.id, "h2"]);
  });

  test("見出しの範囲は同レベル以下の見出しまで", () => {
    const { blocks, newBlock } = duplicateBlock(
      [heading("h1", 1), heading("h2", 2), text("a")],
      "h2",
    );

    expect(ids(blocks)).toEqual(["h1", "h2", "a", newBlock!.id]);
  });

  test("存在しない id は元の列をそのまま返す", () => {
    const before = [text("a")];
    const { blocks, newBlock } = duplicateBlock(before, "nope");

    expect(blocks).toBe(before);
    expect(newBlock).toBeUndefined();
  });
});

describe("updateBlockById", () => {
  test("Branch アームの中のブロックも更新できる", () => {
    const blocks = updateBlockById([branch("br", "arm1", [text("x")])], "x", (block) => {
      block.title = "更新後";
    });

    expect(blocks[0]?.type === "Branch" && blocks[0].branches[0]?.steps[0]?.title).toBe("更新後");
  });

  test("未変更のブロックは参照を保つ", () => {
    const before = [text("a"), text("b")];
    const blocks = updateBlockById(before, "a", (block) => {
      block.title = "更新後";
    });

    expect(blocks[1]).toBe(before[1]);
  });
});

describe("sameBlockContainer", () => {
  test("ルート同士は等しい", () => {
    expect(sameBlockContainer(root, { kind: "root" })).toBe(true);
  });

  test("ルートと枝は等しくない", () => {
    expect(sameBlockContainer(root, arm("br", "arm1"))).toBe(false);
    expect(sameBlockContainer(arm("br", "arm1"), root)).toBe(false);
  });

  test("同じ枝だけが等しい", () => {
    expect(sameBlockContainer(arm("br", "arm1"), arm("br", "arm1"))).toBe(true);
    expect(sameBlockContainer(arm("br", "arm1"), arm("br", "arm2"))).toBe(false);
  });
});
