import type { Meta, StoryObj } from "@storybook/react-vite";

import type { Step } from "@/flow/schema";

import { DetailPanel } from "@/flow/components/DetailPanel";
import { getEntry } from "@/flow/registry";
import { useEditorStore } from "@/flow/store/editorStore";

// registry の defaults をベースに、表示が意味を持つよう具体値を被せた 1 ステップを
// 単一セクションに入れて選択状態にする。各 step type の DetailPanel を VRT で個別に撮る。
const stepFor = (type: Step["type"], extra: Record<string, unknown>): Step =>
  ({ ...getEntry(type)?.defaults(), id: type, ...extra }) as Step;

const seed = (step: Step) => {
  useEditorStore.setState({
    flowData: {
      version: 1,
      sections: [{ id: "s", title: "", memo: "", collapsed: false, steps: [step] }],
    },
    gameFlags: {},
    selectedStepId: step.id,
    initialized: true,
  });
};

const meta = {
  title: "Flow/DetailPanel",
  component: DetailPanel,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (step: Step): Story => ({
  render: () => {
    seed(step);
    return (
      <div className="w-[480px] bg-base-100">
        <DetailPanel />
      </div>
    );
  },
});

export const CreateRole = story(stepFor("CreateRole", { roles: ["市民", "人狼"] }));
export const DeleteRole = story(stepFor("DeleteRole", { deleteAll: false, roleNames: ["市民"] }));
export const CreateCategory = story(
  stepFor("CreateCategory", { categoryName: { type: "literal", value: "会議室" } }),
);
export const DeleteCategory = story(stepFor("DeleteCategory", {}));
export const CreateChannel = story(
  stepFor("CreateChannel", { channels: [{ name: "全体", type: "text", rolePermissions: [] }] }),
);
export const DeleteChannel = story(stepFor("DeleteChannel", { channelNames: ["全体"] }));
export const ChangeChannelPermission = story(
  stepFor("ChangeChannelPermission", {
    channelName: "全体",
    rolePermissions: [{ roleName: "市民", canWrite: true }],
  }),
);
export const AddRoleToRoleMembers = story(
  stepFor("AddRoleToRoleMembers", { memberRoleName: "市民", addRoleName: "生存者" }),
);
export const SendMessage = story(
  stepFor("SendMessage", {
    channelTargets: [{ type: "channelName", value: "全体" }],
    messages: [{ content: "ゲームを開始します", attachments: [] }],
  }),
);
export const CombinationSendMessage = story(
  stepFor("CombinationSendMessage", {
    entries: [
      {
        id: "e1",
        channelName: "個別",
        messages: [{ content: "あなたの役職は人狼です", attachments: [] }],
        collapsed: false,
      },
    ],
  }),
);
export const SetGameFlag = story(stepFor("SetGameFlag", { flagKey: "phase", flagValue: "day" }));
export const Branch = story(
  stepFor("Branch", {
    mode: "select",
    flagName: "vote",
    branches: [
      { id: "b1", label: "処刑する", steps: [] },
      { id: "b2", label: "処刑しない", steps: [] },
    ],
  }),
);
// auto モード: 条件付き枝が ConditionTreeEditor を描画する経路を VRT で押さえる。
// 決定的にするため id は固定 (generateId / randomUUID を介さない)。
export const BranchAuto = story(
  stepFor("Branch", {
    mode: "auto",
    matchMode: "first",
    branches: [
      {
        id: "b1",
        label: "赤チーム",
        condition: {
          type: "rule",
          id: "r1",
          flagKey: "team",
          operator: "equals",
          value: "red",
          valueType: "literal",
        },
        steps: [],
      },
      { id: "b2", label: "デフォルト", steps: [] },
    ],
  }),
);
export const Kanban = story(stepFor("Kanban", {}));
export const Counter = story(stepFor("Counter", { flagKey: "round", step: 1 }));
export const ShuffleAssign = story(
  stepFor("ShuffleAssign", { items: ["A", "B"], targets: ["X", "Y"], resultFlagPrefix: "assign" }),
);
export const RandomSelect = story(
  stepFor("RandomSelect", { items: ["A", "B"], resultFlagKey: "winner" }),
);
export const RecordCombination = story(stepFor("RecordCombination", {}));
