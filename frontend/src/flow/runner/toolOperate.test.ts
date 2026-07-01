import { describe, expect, test } from "bun:test";

import { counterNextValue, drawRandomSelect, shuffleAssign } from "./toolOperate";

// 決定的に検証するため恒等シャッフルを渡す。
const identity = <T>(array: T[]): T[] => [...array];

describe("counterNextValue", () => {
  test("現在値に step を足す", () => {
    expect(counterNextValue("3", 1)).toBe("4");
    expect(counterNextValue("10", 5)).toBe("15");
  });

  test("未設定や数値化不能は 0 起点", () => {
    expect(counterNextValue(undefined, 2)).toBe("2");
    expect(counterNextValue("abc", 1)).toBe("1");
  });
});

describe("drawRandomSelect", () => {
  test("恒等シャッフルなら先頭を選ぶ", () => {
    expect(drawRandomSelect(["A", "B", "C"], identity)).toBe("A");
  });

  test("空白を除外する", () => {
    expect(drawRandomSelect(["  ", "B"], identity)).toBe("B");
  });

  test("候補が空なら undefined", () => {
    expect(drawRandomSelect([" ", ""], identity)).toBeUndefined();
  });
});

describe("shuffleAssign", () => {
  test("items を targets にラウンドロビンで割り当てフラグへ集約する", () => {
    const result = shuffleAssign(["a", "b", "c"], ["X", "Y"], "assign", identity);
    expect(result?.assignedResults).toEqual({ X: ["a", "c"], Y: ["b"] });
    expect(result?.flagPatch).toEqual({ assign_X: "a, c", assign_Y: "b" });
  });

  test("items か targets が空なら undefined", () => {
    expect(shuffleAssign([], ["X"], "p", identity)).toBeUndefined();
    expect(shuffleAssign(["a"], [], "p", identity)).toBeUndefined();
  });
});
