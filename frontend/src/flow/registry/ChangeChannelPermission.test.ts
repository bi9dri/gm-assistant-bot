import { describe, expect, test } from "bun:test";

import type { ChangeChannelPermissionStep } from "../schema";

import { ChangeChannelPermissionEntry } from "./ChangeChannelPermission";

const makeStep = (
  overrides: Partial<ChangeChannelPermissionStep> = {},
): ChangeChannelPermissionStep => ({
  id: "step-1",
  type: "ChangeChannelPermission",
  title: "チャンネル権限を変更する",
  memo: "",
  autoAdvance: false,
  channelName: "",
  rolePermissions: [],
  ...overrides,
});

describe("ChangeChannelPermissionEntry.summary", () => {
  test("チャンネル名未設定はフォールバック", () => {
    expect(ChangeChannelPermissionEntry.summary(makeStep())).toBe("権限変更 (未設定)");
  });

  test("空白のみのチャンネル名もフォールバック", () => {
    expect(ChangeChannelPermissionEntry.summary(makeStep({ channelName: "   " }))).toBe(
      "権限変更 (未設定)",
    );
  });

  test("チャンネル名と有効なロール数を要約", () => {
    const step = makeStep({
      channelName: "全体",
      rolePermissions: [
        { roleName: "プレイヤー", canWrite: true },
        { roleName: "", canWrite: false },
        { roleName: "観戦者", canWrite: false },
      ],
    });
    expect(ChangeChannelPermissionEntry.summary(step)).toBe("権限変更: 全体 (2件)");
  });

  test("ロール未設定なら 0 件", () => {
    expect(ChangeChannelPermissionEntry.summary(makeStep({ channelName: "全体" }))).toBe(
      "権限変更: 全体 (0件)",
    );
  });
});
