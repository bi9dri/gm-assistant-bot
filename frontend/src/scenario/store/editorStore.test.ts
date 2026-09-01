import { beforeEach, describe, expect, test } from "bun:test";

import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";

import { emptyDoc } from "../schema";
import { newStep, useScenarioEditorStore } from "./editorStore";

// 編集モードの store。本文 (doc) は ProseMirror の木をそのまま預かるだけで、
// 操作の実体 (steps) だけをこの store が変更する (docs: scenario-editor-architecture D25)。

const counter = (id: string): Step => ({
  id,
  type: "Counter",
  title: "周回",
  memo: "",
  autoAdvance: false,
  flagKey: "round",
  step: 1,
});

const branch = (id: string, child: Step): Step => ({
  id,
  type: "Branch",
  title: "分岐",
  memo: "",
  autoAdvance: false,
  mode: "select",
  matchMode: "first",
  flagName: "vote",
  branches: [{ id: `${id}-arm`, label: "枝", steps: [child] }],
});

const docWith = (text: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const store = () => useScenarioEditorStore.getState();

beforeEach(() => {
  useScenarioEditorStore.setState({
    doc: emptyDoc(),
    steps: [],
    gameFlags: {},
    selectedStepId: null,
    initialized: false,
  });
});

describe("initialize", () => {
  test("本文・実体・フラグを読み込み、選択を外す", () => {
    useScenarioEditorStore.setState({ selectedStepId: "c1" });

    store().initialize(docWith("本文"), [counter("c1")], { round: "1" });

    expect(store().doc).toEqual(docWith("本文"));
    expect(store().steps.map((step) => step.id)).toEqual(["c1"]);
    expect(store().gameFlags).toEqual({ round: "1" });
    expect(store().selectedStepId).toBeNull();
    expect(store().initialized).toBe(true);
  });
});

describe("setDoc", () => {
  test("本文だけを差し替え、実体は残す", () => {
    store().initialize(emptyDoc(), [counter("c1")], {});

    store().setDoc(docWith("書き換えた"));

    expect(store().doc).toEqual(docWith("書き換えた"));
    // 孤児の除去は保存時に行うので、打鍵の途中では実体を落とさない。
    expect(store().steps.map((step) => step.id)).toEqual(["c1"]);
  });
});

describe("createStep", () => {
  test("registry の初期値から実体を作り、選択する", () => {
    store().initialize(emptyDoc(), [], {});

    const created = store().createStep("Counter");

    expect(created?.type).toBe("Counter");
    expect(store().steps.map((step) => step.id)).toEqual([created!.id]);
    expect(store().selectedStepId).toBe(created!.id);
  });

  test("未知の型では何も起きない", () => {
    store().initialize(emptyDoc(), [], {});

    expect(store().createStep("Unknown" as Step["type"])).toBeUndefined();
    expect(store().steps).toEqual([]);
  });
});

describe("updateStep", () => {
  test("実体を更新し、他のステップの参照は保つ", () => {
    store().initialize(emptyDoc(), [counter("c1"), counter("c2")], {});
    const untouched = store().steps[1];

    store().updateStep("c1", { title: "書き換えた" });

    expect(store().steps[0]?.title).toBe("書き換えた");
    expect(store().steps[1]).toBe(untouched!);
  });

  test("Branch の枝に入れ子のステップも更新できる", () => {
    store().initialize(emptyDoc(), [branch("br", counter("c1"))], {});

    store().updateStep("c1", { title: "枝の中" });

    const target = store().steps[0];
    if (target?.type !== "Branch") throw new Error("expected Branch");
    expect(target.branches[0]?.steps[0]?.title).toBe("枝の中");
  });
});

describe("newStep", () => {
  test("枝に入れる実体は top-level の steps に載せずに作れる", () => {
    store().initialize(emptyDoc(), [], {});

    const created = newStep("Counter");

    expect(created?.type).toBe("Counter");
    expect(store().steps).toEqual([]);
  });
});

describe("gameFlags", () => {
  test("追加と削除ができる", () => {
    store().initialize(emptyDoc(), [], { a: "1" });

    store().setGameFlag("b", "2");
    store().removeGameFlag("a");

    expect(store().gameFlags).toEqual({ b: "2" });
  });
});
