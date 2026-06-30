import { CreateRoleStepSchema, type CreateRoleStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const nonEmpty = (values: string[]): string[] => values.filter((value) => value.trim() !== "");

const CreateRoleDetailPanel = ({ step, onChange }: DetailPanelProps<CreateRoleStep>) => (
  <div className="flex flex-col gap-2">
    {step.roles.map((role, index) => (
      // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
      <div key={`role-${index}`} className="flex items-center gap-2">
        <input
          type="text"
          className="input input-bordered w-full"
          value={role}
          onChange={(evt) =>
            onChange({
              roles: step.roles.map((value, i) => (i === index ? evt.target.value : value)),
            })
          }
          placeholder="ロール名を入力"
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ roles: step.roles.filter((_, i) => i !== index) })}
        >
          削除
        </button>
      </div>
    ))}
    <button
      type="button"
      className="btn btn-ghost btn-sm self-start"
      onClick={() => onChange({ roles: [...step.roles, ""] })}
    >
      ロールを追加
    </button>
  </div>
);

export const CreateRoleEntry = defineStep<CreateRoleStep>({
  type: "CreateRole",
  schema: CreateRoleStepSchema,
  category: "action",
  defaults: () => ({
    type: "CreateRole",
    title: "ロールを作成する",
    memo: "",
    autoAdvance: false,
    roles: [],
  }),
  summary: (step) => {
    const roles = nonEmpty(step.roles);
    return roles.length > 0 ? `ロール作成: ${roles.join(", ")}` : "ロール作成 (未設定)";
  },
  DetailPanel: CreateRoleDetailPanel,
});
