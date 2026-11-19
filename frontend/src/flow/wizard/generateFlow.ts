import { generateId } from "../ids";
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

export const MIN_VOICE_CHANNEL_COUNT = 0;
export const MAX_VOICE_CHANNEL_COUNT = 10;

type StepFields<S extends Step> = Omit<S, "id" | "memo" | "autoAdvance">;

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
    ...validSharedChannels.map((name) => ({
      name,
      type: "text" as const,
      rolePermissions: commonRoles.map((roleName) => ({ roleName, canWrite: true })),
    })),
    ...validCharacters.map((name) => ({
      name,
      type: "text" as const,
      rolePermissions: [
        { roleName: name, canWrite: true },
        { roleName: spectatorRole, canWrite: false },
      ],
    })),
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

  const postSessionSteps: Step[] = [
    step<AddRoleToRoleMembersStep>({
      type: "AddRoleToRoleMembers",
      title: "プレイヤーに観戦ロールを付与",
      memberRoleName: plRole,
      addRoleName: spectatorRole,
    }),
  ];

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
      title: "セッション後",
      memo: "",
      collapsed: false,
      steps: withChaining(postSessionSteps),
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
