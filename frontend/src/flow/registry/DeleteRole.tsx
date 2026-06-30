import { ResourceSelector } from "@/components/Node/utils";

import { DeleteRoleStepSchema, type DeleteRoleStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const nonEmpty = (values: string[]): string[] => values.filter((value) => value.trim() !== "");

const DeleteRoleDetailPanel = ({ step, onChange }: DetailPanelProps<DeleteRoleStep>) => (
  <div className="flex flex-col gap-2">
    <label className="label cursor-pointer justify-start gap-2">
      <input
        type="checkbox"
        className="checkbox"
        checked={step.deleteAll}
        onChange={(evt) => onChange({ deleteAll: evt.target.checked })}
      />
      <span className="label-text">すべて削除</span>
    </label>

    {!step.deleteAll && (
      <>
        {step.roleNames.map((name, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
          <div key={`role-${index}`} className="flex items-center gap-2">
            <div className="flex-1">
              <ResourceSelector
                nodeId={step.id}
                resourceType="role"
                value={name}
                onChange={(newName) =>
                  onChange({ roleNames: step.roleNames.map((v, i) => (i === index ? newName : v)) })
                }
                placeholder="ロール名を入力"
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ roleNames: step.roleNames.filter((_, i) => i !== index) })}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start"
          onClick={() => onChange({ roleNames: [...step.roleNames, ""] })}
        >
          ロールを追加
        </button>
      </>
    )}
  </div>
);

export const DeleteRoleEntry = defineStep<DeleteRoleStep>({
  type: "DeleteRole",
  schema: DeleteRoleStepSchema,
  category: "action",
  defaults: () => ({
    type: "DeleteRole",
    title: "ロールを削除する",
    memo: "",
    autoAdvance: false,
    deleteAll: false,
    roleNames: [],
  }),
  summary: (step) => {
    if (step.deleteAll) return "ロール削除: すべて";
    const names = nonEmpty(step.roleNames);
    return names.length > 0 ? `ロール削除: ${names.join(", ")}` : "ロール削除 (未設定)";
  },
  DetailPanel: DeleteRoleDetailPanel,
});
