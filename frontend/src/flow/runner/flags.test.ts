import { describe, expect, test } from "vite-plus/test";

import { coerceFlags } from "./flags";

describe("coerceFlags", () => {
  test("プリミティブや未定義値を文字列フラグへ正規化する", () => {
    expect(
      coerceFlags({
        str: "ok",
        num: 42,
        bool: true,
        emptyNull: null,
        emptyUndef: undefined,
        obj: { a: 1 },
      }),
    ).toEqual({
      str: "ok",
      num: "42",
      bool: "true",
      emptyNull: "",
      emptyUndef: "",
      obj: '{"a":1}',
    });
  });
});
