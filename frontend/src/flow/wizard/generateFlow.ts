import type {
  AddRoleToRoleMembersStep,
  CreateCategoryStep,
  CreateChannelStep,
  CreateRoleStep,
  DeleteCategoryStep,
  DeleteRoleStep,
  FlowData,
  Step,
} from "../schema";
import type { Section } from "../treeOps";

import { generateId } from "../ids";

// 新規テンプレートウィザード (旧 Blueprint ノードの置き換え)。
// キャラクター名 / VC 数 / カテゴリ名 / 共通テキストチャンネルから、
// 初期セクション + ステップ (FlowData) を純粋に生成する。
// 旧 templateEditorStore.expandBlueprint と同じ Discord 構成を再現する。

export interface WizardParams {
  characterNames: string[];
  voiceChannelCount: number;
  categoryName: string;
  sharedTextChannels: string[];
}

export const defaultWizardParams: WizardParams = {
  characterNames: [],
  voiceChannelCount: 0,
  categoryName: "",
  sharedTextChannels: [],
};

// VC 数の下限・上限 (旧 Blueprint と同じ)。
export const MIN_VOICE_CHANNEL_COUNT = 0;
export const MAX_VOICE_CHANNEL_COUNT = 10;

type StepFields<S extends Step> = Omit<S, "id" | "memo" | "autoAdvance">;

// チェーン実行の橋渡し: 配列の末尾以外に autoAdvance を立て、1 操作で連続実行させる。
// 末尾は false のままにして、セクションを跨いで次セクションへ連鎖しないよう止める
// (engine の advanceCursor は全セクションを平坦化して進むため)。
const withChaining = (steps: Step[]): Step[] =>
  steps.map((step, index) => ({ ...step, autoAdvance: index < steps.length - 1 }));

export const generateWizardFlow = (
  params: WizardParams,
  genId: () => string = generateId,
): FlowData => {
  const validCharacters = params.characterNames.map((name) => name.trim()).filter(Boolean);
  const validSharedChannels = params.sharedTextChannels.map((name) => name.trim()).filter(Boolean);
  const voiceChannelCount = Math.max(
    MIN_VOICE_CHANNEL_COUNT,
    Math.min(MAX_VOICE_CHANNEL_COUNT, Math.trunc(params.voiceChannelCount)),
  );

  const sessionPrefix = params.categoryName.trim();
  const commonRoles = sessionPrefix
    ? [`${sessionPrefix}PL`, `${sessionPrefix}観戦`]
    : ["PL", "観戦"];
  const [plRole, spectatorRole] = commonRoles;
  const allRoles = [...commonRoles, ...validCharacters];

  const step = <S extends Step>(fields: StepFields<S>): S =>
    ({ id: genId(), memo: "", autoAdvance: false, ...fields }) as S;

  // ---- 準備セクション: ロール/カテゴリ/チャンネル作成 → 観戦ロール付与 ----
  const setupSteps: Step[] = [];

  setupSteps.push(
    step<CreateRoleStep>({ type: "CreateRole", title: "ロールを作成する", roles: allRoles }),
  );

  if (sessionPrefix) {
    setupSteps.push(
      step<CreateCategoryStep>({
        type: "CreateCategory",
        title: "カテゴリを作成する",
        categoryName: { type: "literal", value: sessionPrefix },
      }),
    );
  }

  const channels: CreateChannelStep["channels"] = [
    // 共通テキストチャンネル: PL・観戦が書き込み可
    ...validSharedChannels.map((name) => ({
      name,
      type: "text" as const,
      rolePermissions: commonRoles.map((roleName) => ({ roleName, canWrite: true })),
    })),
    // キャラクター個別チャンネル: 本人が書き込み可、観戦は閲覧のみ
    ...validCharacters.map((name) => ({
      name,
      type: "text" as const,
      rolePermissions: [
        { roleName: name, canWrite: true },
        { roleName: "観戦", canWrite: false },
      ],
    })),
    // ボイスチャンネル: PL・観戦がアクセス可
    ...Array.from({ length: voiceChannelCount }, (_, i) => ({
      name: `VC-${i + 1}`,
      type: "voice" as const,
      rolePermissions: commonRoles.map((roleName) => ({ roleName, canWrite: true })),
    })),
  ];

  if (channels.length > 0) {
    setupSteps.push(
      step<CreateChannelStep>({ type: "CreateChannel", title: "チャンネルを作成する", channels }),
    );
  }

  setupSteps.push(
    step<AddRoleToRoleMembersStep>({
      type: "AddRoleToRoleMembers",
      title: "ロールメンバーにロールを付与",
      memberRoleName: plRole,
      addRoleName: spectatorRole,
    }),
  );

  // ---- 片付けセクション: カテゴリ削除 → 全ロール削除 ----
  const teardownSteps: Step[] = [
    step<DeleteCategoryStep>({ type: "DeleteCategory", title: "カテゴリを削除する" }),
    step<DeleteRoleStep>({
      type: "DeleteRole",
      title: "ロールを削除する",
      deleteAll: true,
      roleNames: [],
    }),
  ];

  const sections: Section[] = [
    {
      id: genId(),
      title: "準備",
      memo: "",
      collapsed: false,
      steps: withChaining(setupSteps),
    },
    {
      id: genId(),
      title: "片付け",
      memo: "",
      collapsed: false,
      steps: withChaining(teardownSteps),
    },
  ];

  return { version: 1, sections };
};
