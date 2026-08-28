import { describe, test, expect } from "bun:test";

import {
  formatDuration,
  formatPlayerCount,
  matchesTemplateFilter,
  type TemplateFilterCriteria,
} from "./templateFilter";

const META = {
  system: "クトゥルフ神話TRPG",
  playerCountMin: 2,
  playerCountMax: 4,
  durationMinutesMin: 120,
  durationMinutesMax: 180,
};

describe("matchesTemplateFilter", () => {
  test("条件が空なら常にマッチする", () => {
    expect(matchesTemplateFilter({}, {})).toBe(true);
    expect(matchesTemplateFilter(META, {})).toBe(true);
  });

  test("システムは完全一致で判定する", () => {
    expect(matchesTemplateFilter(META, { system: "クトゥルフ神話TRPG" })).toBe(true);
    expect(matchesTemplateFilter(META, { system: "エモクロアTRPG" })).toBe(false);
    expect(matchesTemplateFilter({}, { system: "クトゥルフ神話TRPG" })).toBe(false);
  });

  describe("人数", () => {
    test.each<[number, boolean]>([
      [1, false],
      [2, true],
      [3, true],
      [4, true],
      [5, false],
    ])("2〜4人のテンプレートは %i 人で %p", (playerCount, expected) => {
      expect(matchesTemplateFilter(META, { playerCount })).toBe(expected);
    });

    test("片側だけ指定されたテンプレートはその側だけで判定する", () => {
      expect(matchesTemplateFilter({ playerCountMin: 4 }, { playerCount: 10 })).toBe(true);
      expect(matchesTemplateFilter({ playerCountMin: 4 }, { playerCount: 3 })).toBe(false);
      expect(matchesTemplateFilter({ playerCountMax: 4 }, { playerCount: 1 })).toBe(true);
      expect(matchesTemplateFilter({ playerCountMax: 4 }, { playerCount: 5 })).toBe(false);
    });

    test("人数未設定のテンプレートは除外する", () => {
      expect(matchesTemplateFilter({ system: "X" }, { playerCount: 3 })).toBe(false);
    });
  });

  describe("所要時間", () => {
    test("範囲の上限で判定する (2〜3時間は2時間以内に収まらない)", () => {
      expect(matchesTemplateFilter(META, { maxDurationMinutes: 120 })).toBe(false);
      expect(matchesTemplateFilter(META, { maxDurationMinutes: 180 })).toBe(true);
      expect(matchesTemplateFilter(META, { maxDurationMinutes: 240 })).toBe(true);
    });

    test("上限未設定なら下限で判定する", () => {
      expect(matchesTemplateFilter({ durationMinutesMin: 120 }, { maxDurationMinutes: 120 })).toBe(
        true,
      );
      expect(matchesTemplateFilter({ durationMinutesMin: 180 }, { maxDurationMinutes: 120 })).toBe(
        false,
      );
    });

    test("所要時間未設定のテンプレートは除外する", () => {
      expect(matchesTemplateFilter({ playerCountMin: 2 }, { maxDurationMinutes: 120 })).toBe(false);
    });
  });

  test("複数条件は AND で効く", () => {
    const criteria: TemplateFilterCriteria = {
      system: "クトゥルフ神話TRPG",
      playerCount: 3,
      maxDurationMinutes: 180,
    };
    expect(matchesTemplateFilter(META, criteria)).toBe(true);
    expect(matchesTemplateFilter({ ...META, playerCountMax: 2 }, criteria)).toBe(false);
  });
});

describe("表示用フォーマット", () => {
  test("人数", () => {
    expect(formatPlayerCount(META)).toBe("2人〜4人");
    expect(formatPlayerCount({ playerCountMin: 4, playerCountMax: 4 })).toBe("4人");
    expect(formatPlayerCount({ playerCountMin: 4 })).toBe("4人以上");
    expect(formatPlayerCount({ playerCountMax: 4 })).toBe("4人以下");
    expect(formatPlayerCount({})).toBeUndefined();
  });

  test("所要時間は60分単位なら時間表記にする", () => {
    expect(formatDuration(META)).toBe("2時間〜3時間");
    expect(formatDuration({ durationMinutesMin: 90, durationMinutesMax: 90 })).toBe("90分");
    expect(formatDuration({ durationMinutesMax: 240 })).toBe("4時間以下");
    expect(formatDuration({})).toBeUndefined();
  });
});
