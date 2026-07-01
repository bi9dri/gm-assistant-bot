import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

import { AddRoleToRoleMembersStepSchema, type AddRoleToRoleMembersStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const AddRoleToRoleMembersDetailPanel = ({
  step,
  onChange,
}: DetailPanelProps<AddRoleToRoleMembersStep>) => (
  <div className="flex flex-col gap-2">
    <div>
      <label className="label py-1">
        <span className="label-text text-xs">対象メンバーのロール名</span>
      </label>
      <ResourceSelector
        nodeId={step.id}
        resourceType="role"
        value={step.memberRoleName}
        onChange={(value) => onChange({ memberRoleName: value })}
        placeholder="例: プレイヤー"
      />
    </div>
    <div>
      <label className="label py-1">
        <span className="label-text text-xs">付与するロール名</span>
      </label>
      <ResourceSelector
        nodeId={step.id}
        resourceType="role"
        value={step.addRoleName}
        onChange={(value) => onChange({ addRoleName: value })}
        placeholder="例: 参加者"
      />
    </div>
  </div>
);

export const AddRoleToRoleMembersEntry = defineStep<AddRoleToRoleMembersStep>({
  type: "AddRoleToRoleMembers",
  schema: AddRoleToRoleMembersStepSchema,
  category: "action",
  defaults: () => ({
    type: "AddRoleToRoleMembers",
    title: "ロールメンバーにロールを付与",
    memo: "",
    autoAdvance: false,
    memberRoleName: "",
    addRoleName: "",
  }),
  summary: (step) => {
    const member = step.memberRoleName.trim();
    const add = step.addRoleName.trim();
    return member !== "" && add !== "" ? `ロール付与: ${member} → ${add}` : "ロール付与 (未設定)";
  },
  DetailPanel: AddRoleToRoleMembersDetailPanel,
});
