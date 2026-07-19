import { describe, expect, test } from "bun:test";

import type { ConditionNode } from "@/components/Node/utils/evaluateCondition";

import type { ExecuteContext } from "../engine/types";
import type { Step } from "../schema";

import { createFakeContext } from "../engine/fakeContext";
import { getEntry } from "./index";

// 各ステップタイプの execute() を、インメモリ ExecuteContext (createFakeContext) で検証する。
// Discord 呼び出しは state.calls に記録され、リソース/フラグはインメモリで更新される。

const base = {
  memo: "",
  autoAdvance: false,
};

// getEntry(type).execute を引く薄いヘルパ。
const run = (step: Step, ctx: ExecuteContext) => {
  const entry = getEntry(step.type);
  if (entry?.execute === undefined) throw new Error(`no execute for ${step.type}`);
  return entry.execute(step, ctx);
};

describe("CreateRole.execute", () => {
  test("ロールを作成して記録する", async () => {
    const { ctx, state } = createFakeContext();
    const result = await run(
      { id: "s", type: "CreateRole", title: "", ...base, roles: ["市民", "人狼"] },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.calls.filter((c) => c.method === "createRole")).toHaveLength(2);
    expect(state.roles.map((r) => r.name)).toEqual(["市民", "人狼"]);
  });

  test("空なら error", async () => {
    const { ctx } = createFakeContext();
    const result = await run({ id: "s", type: "CreateRole", title: "", ...base, roles: [] }, ctx);
    expect(result.status).toBe("error");
  });

  test("API 失敗で error になり失敗ロールを列挙する", async () => {
    const { ctx } = createFakeContext({ failOn: { createRole: true } });
    const result = await run(
      { id: "s", type: "CreateRole", title: "", ...base, roles: ["市民"] },
      ctx,
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("市民");
  });
});

describe("DeleteRole.execute", () => {
  test("deleteAll で全ロールを削除する", async () => {
    const { ctx, state } = createFakeContext({
      roles: [
        { id: "r1", name: "市民" },
        { id: "r2", name: "人狼" },
      ],
    });
    const result = await run(
      { id: "s", type: "DeleteRole", title: "", ...base, deleteAll: true, roleNames: [] },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.roles).toHaveLength(0);
  });

  test("指定名が見つからなければ error で中断する", async () => {
    const { ctx, state } = createFakeContext({ roles: [{ id: "r1", name: "市民" }] });
    const result = await run(
      { id: "s", type: "DeleteRole", title: "", ...base, deleteAll: false, roleNames: ["幽霊"] },
      ctx,
    );
    expect(result.status).toBe("error");
    expect(state.calls).toHaveLength(0);
  });
});

describe("CreateCategory.execute", () => {
  test("literal 名でカテゴリを作成する", async () => {
    const { ctx, state } = createFakeContext();
    const result = await run(
      {
        id: "s",
        type: "CreateCategory",
        title: "",
        ...base,
        categoryName: { type: "literal", value: "会議室" },
      },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.categories.map((c) => c.name)).toEqual(["会議室"]);
  });

  test("session.name を解決する", async () => {
    const { ctx, state } = createFakeContext({ sessionName: "第1回" });
    await run(
      {
        id: "s",
        type: "CreateCategory",
        title: "",
        ...base,
        categoryName: { type: "session.name" },
      },
      ctx,
    );
    expect(state.categories.map((c) => c.name)).toEqual(["第1回"]);
  });

  test("空名は error", async () => {
    const { ctx } = createFakeContext();
    const result = await run(
      {
        id: "s",
        type: "CreateCategory",
        title: "",
        ...base,
        categoryName: { type: "literal", value: "  " },
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });
});

describe("DeleteCategory.execute", () => {
  test("チャンネルを先に、次にカテゴリを削除する", async () => {
    const { ctx, state } = createFakeContext({
      categories: [{ id: "cat1", name: "会議" }],
      channels: [{ id: "ch1", name: "全体", type: "text", writerRoleIds: [], readerRoleIds: [] }],
    });
    const result = await run({ id: "s", type: "DeleteCategory", title: "", ...base }, ctx);
    expect(result.status).toBe("success");
    expect(state.channels).toHaveLength(0);
    expect(state.categories).toHaveLength(0);
    expect(state.calls.map((c) => c.arg)).toEqual(["ch1", "cat1"]);
  });

  test("カテゴリが無ければ success (何もしない)", async () => {
    const { ctx, state } = createFakeContext();
    const result = await run({ id: "s", type: "DeleteCategory", title: "", ...base }, ctx);
    expect(result.status).toBe("success");
    expect(state.calls).toHaveLength(0);
  });
});

describe("CreateChannel.execute", () => {
  const channelStep = (rolePermissions: { roleName: string; canWrite: boolean }[]): Step => ({
    id: "s",
    type: "CreateChannel",
    title: "",
    ...base,
    channels: [{ name: "全体", type: "text", rolePermissions }],
  });

  test("カテゴリ配下にチャンネルを作成し権限ロールを id 解決する", async () => {
    const { ctx, state } = createFakeContext({
      categories: [{ id: "cat1", name: "会議" }],
      roles: [{ id: "r1", name: "市民" }],
    });
    const result = await run(channelStep([{ roleName: "市民", canWrite: true }]), ctx);
    expect(result.status).toBe("success");
    expect(state.channels[0]?.writerRoleIds).toEqual(["r1"]);
    expect(state.channels[0]?.name).toBe("全体");
  });

  test("カテゴリが無ければ error", async () => {
    const { ctx } = createFakeContext({ roles: [] });
    const result = await run(channelStep([]), ctx);
    expect(result.status).toBe("error");
  });

  test("権限ロールが存在しなければ error", async () => {
    const { ctx } = createFakeContext({ categories: [{ id: "cat1", name: "会議" }] });
    const result = await run(channelStep([{ roleName: "幽霊", canWrite: false }]), ctx);
    expect(result.status).toBe("error");
    expect(result.message).toContain("幽霊");
  });
});

describe("DeleteChannel.execute", () => {
  test("名前一致 (大小無視) で削除する", async () => {
    const { ctx, state } = createFakeContext({
      channels: [{ id: "ch1", name: "全体", type: "text", writerRoleIds: [], readerRoleIds: [] }],
    });
    const result = await run(
      { id: "s", type: "DeleteChannel", title: "", ...base, channelNames: ["全体"] },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.channels).toHaveLength(0);
  });

  test("見つからなければ error で中断", async () => {
    const { ctx, state } = createFakeContext();
    const result = await run(
      { id: "s", type: "DeleteChannel", title: "", ...base, channelNames: ["無い"] },
      ctx,
    );
    expect(result.status).toBe("error");
    expect(state.calls).toHaveLength(0);
  });
});

describe("ChangeChannelPermission.execute", () => {
  test("権限を変更しリソースを更新する", async () => {
    const { ctx, state } = createFakeContext({
      channels: [{ id: "ch1", name: "全体", type: "text", writerRoleIds: [], readerRoleIds: [] }],
      roles: [{ id: "r1", name: "市民" }],
    });
    const result = await run(
      {
        id: "s",
        type: "ChangeChannelPermission",
        title: "",
        ...base,
        channelName: "全体",
        rolePermissions: [{ roleName: "市民", canWrite: false }],
      },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.channels[0]?.readerRoleIds).toEqual(["r1"]);
  });

  test("チャンネルが無ければ error", async () => {
    const { ctx } = createFakeContext({ roles: [] });
    const result = await run(
      {
        id: "s",
        type: "ChangeChannelPermission",
        title: "",
        ...base,
        channelName: "無い",
        rolePermissions: [],
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });
});

describe("AddRoleToRoleMembers.execute", () => {
  test("両ロールを id 解決して付与する", async () => {
    const { ctx, state } = createFakeContext({
      roles: [
        { id: "r1", name: "市民" },
        { id: "r2", name: "生存者" },
      ],
    });
    const result = await run(
      {
        id: "s",
        type: "AddRoleToRoleMembers",
        title: "",
        ...base,
        memberRoleName: "市民",
        addRoleName: "生存者",
      },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.calls[0]?.arg).toEqual({ memberRoleId: "r1", addRoleId: "r2" });
  });

  test("片方のロールが無ければ error", async () => {
    const { ctx } = createFakeContext({ roles: [{ id: "r1", name: "市民" }] });
    const result = await run(
      {
        id: "s",
        type: "AddRoleToRoleMembers",
        title: "",
        ...base,
        memberRoleName: "市民",
        addRoleName: "生存者",
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });
});

describe("SendMessage.execute", () => {
  const chan = {
    id: "ch1",
    name: "全体",
    type: "text" as const,
    writerRoleIds: [],
    readerRoleIds: [],
  };

  test("チャンネル名を解決して送信する", async () => {
    const { ctx, state } = createFakeContext({ channels: [chan] });
    const result = await run(
      {
        id: "s",
        type: "SendMessage",
        title: "",
        ...base,
        channelTargets: [{ type: "channelName", value: "全体" }],
        messages: [{ content: "開始", attachments: [] }],
      },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.calls).toHaveLength(1);
  });

  test("flagKey ターゲットをフラグ値で解決する", async () => {
    const { ctx, state } = createFakeContext({ channels: [chan], flags: { room: "全体" } });
    await run(
      {
        id: "s",
        type: "SendMessage",
        title: "",
        ...base,
        channelTargets: [{ type: "flagKey", value: "room" }],
        messages: [{ content: "hi", attachments: [] }],
      },
      ctx,
    );
    const arg = state.calls[0]?.arg as { channelId: string } | undefined;
    expect(arg?.channelId).toBe("ch1");
  });

  test("フラグ未設定は error", async () => {
    const { ctx } = createFakeContext({ channels: [chan] });
    const result = await run(
      {
        id: "s",
        type: "SendMessage",
        title: "",
        ...base,
        channelTargets: [{ type: "flagKey", value: "room" }],
        messages: [{ content: "hi", attachments: [] }],
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });

  test("空メッセージは error", async () => {
    const { ctx } = createFakeContext({ channels: [chan] });
    const result = await run(
      {
        id: "s",
        type: "SendMessage",
        title: "",
        ...base,
        channelTargets: [{ type: "channelName", value: "全体" }],
        messages: [{ content: "  ", attachments: [] }],
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });
});

describe("SetGameFlag.execute", () => {
  test("フラグを書き込む", async () => {
    const { ctx, state } = createFakeContext();
    const result = await run(
      {
        id: "s",
        type: "SetGameFlag",
        title: "",
        ...base,
        flagKey: "phase",
        flagValue: "day",
        flagKeyOptions: [],
        flagValueOptions: [],
      },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(state.flags.phase).toBe("day");
  });

  test("空キーは error", async () => {
    const { ctx } = createFakeContext();
    const result = await run(
      {
        id: "s",
        type: "SetGameFlag",
        title: "",
        ...base,
        flagKey: "  ",
        flagValue: "x",
        flagKeyOptions: [],
        flagValueOptions: [],
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });
});

describe("Branch.execute", () => {
  const rule = (flagKey: string, value: string): ConditionNode => ({
    type: "rule",
    id: "r",
    flagKey,
    operator: "equals",
    value,
    valueType: "literal",
  });

  test("select モードは選択枝の label をフラグに書き arm id を返す", async () => {
    const { ctx, state } = createFakeContext({ branchChoice: "a1" });
    const result = await run(
      {
        id: "br",
        type: "Branch",
        title: "",
        ...base,
        mode: "select",
        matchMode: "first",
        flagName: "投票",
        branches: [
          { id: "a1", label: "処刑", steps: [] },
          { id: "a2", label: "維持", steps: [] },
        ],
      },
      ctx,
    );
    expect(result.branchArmIds).toEqual(["a1"]);
    expect(state.flags["投票"]).toBe("処刑");
  });

  test("select モードで未選択は error", async () => {
    const { ctx } = createFakeContext();
    const result = await run(
      {
        id: "br",
        type: "Branch",
        title: "",
        ...base,
        mode: "select",
        matchMode: "first",
        flagName: "投票",
        branches: [{ id: "a1", label: "処刑", steps: [] }],
      },
      ctx,
    );
    expect(result.status).toBe("error");
  });

  test("auto モードは条件を評価して arm id を返す", async () => {
    const { ctx } = createFakeContext({ flags: { team: "red" } });
    const result = await run(
      {
        id: "br",
        type: "Branch",
        title: "",
        ...base,
        mode: "auto",
        matchMode: "first",
        flagName: "",
        branches: [
          { id: "a1", label: "赤", condition: rule("team", "red"), steps: [] },
          { id: "a2", label: "その他", steps: [] },
        ],
      },
      ctx,
    );
    expect(result.branchArmIds).toEqual(["a1"]);
  });
});
