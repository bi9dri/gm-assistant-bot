import { describe, expect, test } from "bun:test";

import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";

import { collectStepIds, orderedSteps, withDescendantIds } from "./document";

// doc と steps のブリッジ (docs: scenario-editor-architecture D25)。
// 実行順が「読む順」と一致すること、本文から参照が消えた実体が保存時に落ちることを見る。

const stepNode = (stepId: string): JSONContent => ({ type: "step", attrs: { stepId } });
const branchNode = (stepId: string): JSONContent => ({ type: "branch", attrs: { stepId } });
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

const step = (id: string): Step => ({
  id,
  type: "Counter",
  title: id,
  memo: "",
  autoAdvance: false,
  flagKey: "round",
  step: 1,
});

const branchStep = (id: string, children: Step[]): Step => ({
  id,
  type: "Branch",
  title: id,
  memo: "",
  autoAdvance: false,
  mode: "select",
  matchMode: "first",
  flagName: "vote",
  branches: [{ id: `${id}-arm`, label: "枝", steps: children }],
});

describe("collectStepIds", () => {
  test("段落中・箇条書きの中・ブロックの分岐をまとめて出現順に拾う", () => {
    const source = doc(
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "導入" }] },
      paragraph({ type: "text", text: "扉を叩くと" }, stepNode("s1")),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph(stepNode("s2"))] }],
      },
      branchNode("br"),
    );

    expect(collectStepIds(source)).toEqual(["s1", "s2", "br"]);
  });

  test("stepId を持たないノードは無視する", () => {
    expect(collectStepIds(doc(paragraph({ type: "step", attrs: {} })))).toEqual([]);
  });
});

describe("orderedSteps", () => {
  test("本文の出現順に並べ替える", () => {
    const source = doc(paragraph(stepNode("s2")), paragraph(stepNode("s1")));

    expect(orderedSteps(source, [step("s1"), step("s2")]).map((one) => one.id)).toEqual([
      "s2",
      "s1",
    ]);
  });

  test("本文から参照が消えた実体 (孤児) を落とす", () => {
    const source = doc(paragraph(stepNode("s1")));

    expect(orderedSteps(source, [step("s1"), step("gone")]).map((one) => one.id)).toEqual(["s1"]);
  });

  test("チップごと本文をコピーして参照が重複しても実体は 1 つに保つ", () => {
    const source = doc(paragraph(stepNode("s1")), paragraph(stepNode("s1")));

    expect(orderedSteps(source, [step("s1")]).map((one) => one.id)).toEqual(["s1"]);
  });
});

describe("withDescendantIds", () => {
  test("Branch の枝に入れ子のステップまで広げる", () => {
    const steps = [branchStep("br", [step("s1"), branchStep("br2", [step("s2")])])];

    expect(withDescendantIds(["br"], steps).sort()).toEqual(["br", "br2", "s1", "s2"]);
  });

  test("実体が見つからない id はそのまま残す", () => {
    expect(withDescendantIds(["gone"], [])).toEqual(["gone"]);
  });
});
