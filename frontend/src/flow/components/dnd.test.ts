import { describe, expect, test } from "bun:test";

import type { StepContainer } from "../treeOps";

import { dropLocation, emptyContainerDropId, sameContainer } from "./dnd";

const section = (sectionId: string): StepContainer => ({ kind: "section", sectionId });
const arm = (branchStepId: string, armId: string): StepContainer => ({
  kind: "branchArm",
  branchStepId,
  armId,
});

describe("sameContainer", () => {
  test("同一セクション", () => {
    expect(sameContainer(section("s1"), section("s1"))).toBe(true);
  });

  test("別セクション", () => {
    expect(sameContainer(section("s1"), section("s2"))).toBe(false);
  });

  test("同一の分岐枝", () => {
    expect(sameContainer(arm("br", "a1"), arm("br", "a1"))).toBe(true);
  });

  test("同じ分岐の別の枝", () => {
    expect(sameContainer(arm("br", "a1"), arm("br", "a2"))).toBe(false);
  });

  test("セクションと分岐枝は別コンテナ", () => {
    expect(sameContainer(section("s1"), arm("br", "a1"))).toBe(false);
    expect(sameContainer(arm("br", "a1"), section("s1"))).toBe(false);
  });
});

describe("dropLocation", () => {
  test("ステップの上へのドロップはその位置 (手前に挿入)", () => {
    expect(dropLocation({ kind: "step", container: section("s2"), index: 3 })).toEqual({
      container: section("s2"),
      index: 3,
    });
  });

  test("空コンテナへのドロップは先頭", () => {
    expect(dropLocation({ kind: "emptyContainer", container: arm("br", "a2") })).toEqual({
      container: arm("br", "a2"),
      index: 0,
    });
  });

  test("セクションヘッダはドロップ先にならない", () => {
    expect(dropLocation({ kind: "section" })).toBeUndefined();
  });

  test("data なし (undefined) はドロップ先にならない", () => {
    expect(dropLocation(undefined)).toBeUndefined();
  });
});

describe("emptyContainerDropId", () => {
  test("セクションと分岐枝で id が衝突しない", () => {
    expect(emptyContainerDropId(section("x"))).not.toBe(emptyContainerDropId(arm("br", "x")));
  });

  test("同一コンテナなら安定した id を返す", () => {
    expect(emptyContainerDropId(section("s1"))).toBe(emptyContainerDropId(section("s1")));
  });
});
