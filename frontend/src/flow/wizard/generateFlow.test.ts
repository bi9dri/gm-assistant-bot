import { describe, expect, it } from "bun:test";

import { FlowDataSchema, type Step } from "../schema";
import { defaultWizardParams, generateWizardFlow, type WizardParams } from "./generateFlow";

// テスト用の決定的な id 生成 (id-0, id-1, ...)。
const seqId = () => {
  let n = 0;
  return () => `id-${n++}`;
};

const gen = (params: Partial<WizardParams>) =>
  generateWizardFlow({ ...defaultWizardParams, ...params }, seqId());

// 準備セクションの step を type で引く。
const setupStepsOf = (params: Partial<WizardParams>) => gen(params).sections[0].steps;
const findStep = (steps: Step[], type: Step["type"]) => steps.find((s) => s.type === type);

describe("generateWizardFlow", () => {
  it("常に準備・片付けの2セクションを生成する", () => {
    const flow = gen({});
    expect(flow.version).toBe(1);
    expect(flow.sections.map((s) => s.title)).toEqual(["準備", "片付け"]);
  });

  it("生成結果は FlowDataSchema を満たす", () => {
    const flow = gen({
      characterNames: ["探偵", "犯人"],
      voiceChannelCount: 2,
      categoryName: "事件",
      sharedTextChannels: ["全体"],
    });
    expect(FlowDataSchema.safeParse(flow).success).toBe(true);
  });

  it("カテゴリ名なしでは PL / 観戦 ロールを、ありではプレフィックス付きロールを作る", () => {
    const withoutPrefix = findStep(setupStepsOf({ characterNames: ["A"] }), "CreateRole");
    expect(withoutPrefix).toMatchObject({ roles: ["PL", "観戦", "A"] });

    const withPrefix = findStep(
      setupStepsOf({ characterNames: ["A"], categoryName: "事件" }),
      "CreateRole",
    );
    expect(withPrefix).toMatchObject({ roles: ["事件PL", "事件観戦", "A"] });
  });

  it("カテゴリ名があるときだけ CreateCategory を作り literal で埋める", () => {
    expect(findStep(setupStepsOf({}), "CreateCategory")).toBeUndefined();
    expect(findStep(setupStepsOf({ categoryName: "  事件  " }), "CreateCategory")).toMatchObject({
      categoryName: { type: "literal", value: "事件" },
    });
  });

  it("共通チャンネル・キャラチャンネル・VC を正しい権限で作る", () => {
    const channelStep = findStep(
      setupStepsOf({
        characterNames: ["探偵"],
        sharedTextChannels: ["全体"],
        voiceChannelCount: 2,
      }),
      "CreateChannel",
    );
    expect(channelStep?.type).toBe("CreateChannel");
    if (channelStep?.type !== "CreateChannel") throw new Error("unreachable");

    expect(channelStep.channels).toEqual([
      {
        name: "全体",
        type: "text",
        rolePermissions: [
          { roleName: "PL", canWrite: true },
          { roleName: "観戦", canWrite: true },
        ],
      },
      {
        name: "探偵",
        type: "text",
        rolePermissions: [
          { roleName: "探偵", canWrite: true },
          { roleName: "観戦", canWrite: false },
        ],
      },
      { name: "VC-1", type: "voice", rolePermissions: expect.any(Array) },
      { name: "VC-2", type: "voice", rolePermissions: expect.any(Array) },
    ]);
  });

  it("カテゴリ接頭辞があると各チャンネル権限も接頭辞付き観戦ロールを参照する", () => {
    const channelStep = findStep(
      setupStepsOf({
        characterNames: ["探偵"],
        sharedTextChannels: ["全体"],
        categoryName: "事件",
      }),
      "CreateChannel",
    );
    if (channelStep?.type !== "CreateChannel") throw new Error("unreachable");

    // 共通チャンネル: 接頭辞付き PL / 観戦。キャラチャンネル: 接頭辞付き観戦を閲覧のみ。
    expect(channelStep.channels).toEqual([
      {
        name: "全体",
        type: "text",
        rolePermissions: [
          { roleName: "事件PL", canWrite: true },
          { roleName: "事件観戦", canWrite: true },
        ],
      },
      {
        name: "探偵",
        type: "text",
        rolePermissions: [
          { roleName: "探偵", canWrite: true },
          { roleName: "事件観戦", canWrite: false },
        ],
      },
    ]);
  });

  it("作成対象チャンネルが無ければ CreateChannel を省く", () => {
    expect(findStep(setupStepsOf({}), "CreateChannel")).toBeUndefined();
  });

  it("PL メンバーへ観戦ロールを付与するステップを常に作る", () => {
    expect(findStep(setupStepsOf({ categoryName: "事件" }), "AddRoleToRoleMembers")).toMatchObject({
      memberRoleName: "事件PL",
      addRoleName: "事件観戦",
    });
  });

  it("片付けセクションはカテゴリ削除→全ロール削除", () => {
    const teardown = gen({}).sections[1].steps;
    expect(teardown.map((s) => s.type)).toEqual(["DeleteCategory", "DeleteRole"]);
    expect(teardown[1]).toMatchObject({ deleteAll: true, roleNames: [] });
  });

  it("各セクション内の末尾以外を autoAdvance で連鎖させ、末尾で止める", () => {
    const flow = gen({ categoryName: "事件", characterNames: ["A"], sharedTextChannels: ["全体"] });
    for (const section of flow.sections) {
      section.steps.forEach((step, index) => {
        expect(step.autoAdvance).toBe(index < section.steps.length - 1);
      });
    }
  });

  it("空白のみのキャラ名・チャンネル名は除外する", () => {
    const roleStep = findStep(setupStepsOf({ characterNames: ["  ", "探偵", ""] }), "CreateRole");
    expect(roleStep).toMatchObject({ roles: ["PL", "観戦", "探偵"] });
    expect(
      findStep(setupStepsOf({ sharedTextChannels: ["   "] }), "CreateChannel"),
    ).toBeUndefined();
  });

  it("VC 数を 0..10 にクランプし小数を切り捨てる", () => {
    const countVc = (params: Partial<WizardParams>) => {
      const channelStep = findStep(setupStepsOf(params), "CreateChannel");
      if (channelStep?.type !== "CreateChannel") return 0;
      return channelStep.channels.filter((c) => c.type === "voice").length;
    };
    expect(countVc({ voiceChannelCount: -3 })).toBe(0);
    expect(countVc({ voiceChannelCount: 99 })).toBe(10);
    expect(countVc({ voiceChannelCount: 2.9 })).toBe(2);
  });

  it("各 step / section に一意な id を振る", () => {
    const flow = gen({ characterNames: ["A"], categoryName: "事件", sharedTextChannels: ["全体"] });
    const ids = [
      ...flow.sections.map((s) => s.id),
      ...flow.sections.flatMap((s) => s.steps.map((step) => step.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
