import { ConditionTreeEditor, createDefaultRule } from "../components/ConditionTreeEditor";
import { selectAutoArms } from "../engine/branch";
import { generateId } from "../ids";
import { BranchStepSchema, type BranchArm, type BranchStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

const createArm = (label: string): BranchArm => ({
  id: generateId(),
  label,
  steps: [],
});

const BranchDetailPanel = ({ step, onChange }: DetailPanelProps<BranchStep>) => {
  const updateArm = (index: number, patch: Partial<BranchArm>) =>
    onChange({
      branches: step.branches.map((arm, i) => (i === index ? { ...arm, ...patch } : arm)),
    });

  const addArm = () => {
    const label = `枝${step.branches.length + 1}`;
    if (step.mode === "select") {
      onChange({ branches: [...step.branches, createArm(label)] });
      return;
    }
    // auto モード: 新規枝は条件付きで追加し、末尾にデフォルト枝 (条件なし) があれば
    // その手前に挿入する (schema: デフォルト枝は末尾に1つまで)。
    const newArm: BranchArm = { ...createArm(label), condition: createDefaultRule() };
    const branches = [...step.branches];
    const lastArm = branches[branches.length - 1];
    const insertAt =
      lastArm !== undefined && lastArm.condition === undefined
        ? branches.length - 1
        : branches.length;
    branches.splice(insertAt, 0, newArm);
    onChange({ branches });
  };

  const removeArm = (index: number) =>
    onChange({ branches: step.branches.filter((_, i) => i !== index) });

  const setMode = (mode: BranchStep["mode"]) => {
    if (mode === "select") {
      // select モードの枝は条件を持てない (schema superRefine)
      onChange({
        mode,
        branches: step.branches.map((arm) => ({ ...arm, condition: undefined })),
      });
      return;
    }
    // auto モード: デフォルト枝 (条件なし) は末尾 1 つだけ許される。末尾以外で条件が
    // 無い枝にはプレースホルダ条件を補い、デフォルト枝の重複で保存不能になるのを防ぐ。
    const lastIndex = step.branches.length - 1;
    onChange({
      mode,
      branches: step.branches.map((arm, i) =>
        i === lastIndex ? arm : { ...arm, condition: arm.condition ?? createDefaultRule() },
      ),
    });
  };

  const canRemoveArm = step.branches.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            className="radio radio-sm"
            name={`branch-mode-${step.id}`}
            value="auto"
            checked={step.mode === "auto"}
            onChange={() => setMode("auto")}
          />
          自動 (条件で判定)
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            className="radio radio-sm"
            name={`branch-mode-${step.id}`}
            value="select"
            checked={step.mode === "select"}
            onChange={() => setMode("select")}
          />
          選択 (GM が選ぶ)
        </label>
      </div>

      {step.mode === "auto" ? (
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">マッチ方式</span>
          </div>
          <select
            className="select select-bordered select-sm"
            value={step.matchMode}
            onChange={(evt) => onChange({ matchMode: evt.target.value as BranchStep["matchMode"] })}
          >
            <option value="first">最初にマッチした枝のみ</option>
            <option value="all">マッチした全ての枝</option>
          </select>
        </label>
      ) : (
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">選択結果を書き込むフラグ名</span>
          </div>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={step.flagName}
            onChange={(evt) => onChange({ flagName: evt.target.value })}
            placeholder="例: 選択結果"
          />
        </label>
      )}

      <div className="flex flex-col gap-3">
        {step.branches.map((arm, index) => (
          <div key={arm.id} className="border border-base-300 rounded p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input input-bordered input-sm flex-1"
                value={arm.label}
                onChange={(evt) => updateArm(index, { label: evt.target.value })}
                placeholder={`枝${index + 1} のラベル`}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeArm(index)}
                disabled={!canRemoveArm}
              >
                削除
              </button>
            </div>

            {step.mode === "auto" &&
              (arm.condition !== undefined ? (
                <ConditionTreeEditor
                  nodeId={step.id}
                  value={arm.condition}
                  onChange={(condition) => updateArm(index, { condition })}
                  onRemove={() => updateArm(index, { condition: undefined })}
                />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-base-content/60">
                    デフォルト枝 (else): いずれの条件にもマッチしない場合
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => updateArm(index, { condition: createDefaultRule() })}
                  >
                    条件を追加
                  </button>
                </div>
              ))}
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm self-start" onClick={addArm}>
          枝を追加
        </button>
      </div>
    </div>
  );
};

export const BranchEntry = defineStep<BranchStep>({
  type: "Branch",
  schema: BranchStepSchema,
  category: "branch",
  defaults: () => ({
    type: "Branch",
    title: "分岐する",
    memo: "",
    autoAdvance: false,
    mode: "auto",
    matchMode: "first",
    flagName: "",
    branches: [{ id: generateId(), label: "枝1", steps: [] }],
  }),
  summary: (step) => {
    const count = step.branches.length;
    if (step.mode === "select") {
      const flagName = step.flagName.trim();
      return `分岐(選択): ${flagName !== "" ? flagName : "(未設定)"} / ${count}枝`;
    }
    return `分岐(自動): ${count}枝`;
  },
  DetailPanel: BranchDetailPanel,
  // Branch は「どの枝 (arm) に descend するか」を返す。engine が返り値の branchArmIds を
  // executedBranchIds として刻み、その枝の子ステップを実行順序に開く。
  execute: async (step, ctx) => {
    if (step.mode === "select") {
      const armId = ctx.branchChoice;
      if (armId === undefined) return { status: "error", message: "枝を選択してください" };
      const arm = step.branches.find((branch) => branch.id === armId);
      if (arm === undefined) return { status: "error", message: "選択された枝が見つかりません" };
      const flagName = step.flagName.trim();
      if (flagName !== "") await ctx.flags.set({ [flagName]: arm.label });
      return {
        status: "success",
        message: `「${arm.label}」を選択しました`,
        branchArmIds: [armId],
      };
    }

    const armIds = selectAutoArms(step, ctx.flags.get());
    if (armIds.length === 0) {
      return { status: "success", message: "マッチする枝がありませんでした", branchArmIds: [] };
    }
    const labels = armIds
      .map((id) => step.branches.find((arm) => arm.id === id)?.label ?? "")
      .filter((label) => label !== "");
    return {
      status: "success",
      message: `${labels.join(", ")} に分岐しました`,
      branchArmIds: armIds,
    };
  },
});
