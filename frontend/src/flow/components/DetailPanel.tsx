import { useMemo } from "react";

import type { TemplateResources } from "@/components/Node/utils/collectResources";
import { TemplateResourcesOverrideProvider } from "@/components/Node/utils/useTemplateResources";

import { getEntry } from "../registry";
import { collectResourcesFromFlow } from "../resources";
import type { Step } from "../schema";
import { useEditorStore } from "../store/editorStore";
import { findStep } from "../treeOps";

// ステップ 1 つ分の編集フォーム (共通フィールド + registry[type].DetailPanel)。
// store に触れない presentational component として、ステップリスト UI と
// シナリオドキュメント UI の両方から使う。
export const StepDetail = ({
  step,
  resources,
  onChange,
}: {
  step: Step;
  resources: TemplateResources;
  onChange: (patch: Partial<Step>) => void;
}) => {
  const entry = getEntry(step.type);
  const StepDetailPanel = entry?.DetailPanel;

  return (
    <TemplateResourcesOverrideProvider value={resources}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">タイトル</legend>
            <input
              className="input w-full"
              value={step.title}
              placeholder="ステップ名"
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">メモ</legend>
            <textarea
              className="textarea w-full"
              rows={2}
              value={step.memo}
              placeholder="GM 向けメモ"
              onChange={(event) => onChange({ memo: event.target.value })}
            />
          </fieldset>
          <label className="label w-fit cursor-pointer gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={step.autoAdvance}
              onChange={(event) => onChange({ autoAdvance: event.target.checked })}
            />
            実行後に次のステップを自動実行
          </label>
        </div>
        {StepDetailPanel === undefined ? (
          <p className="text-sm text-warning">未対応のステップタイプです: {step.type}</p>
        ) : (
          <>
            <div className="divider my-0" />
            <StepDetailPanel step={step} onChange={onChange} />
          </>
        )}
      </div>
    </TemplateResourcesOverrideProvider>
  );
};

// 中央カラム。選択中ステップを store から引いて StepDetail に渡す。
export const DetailPanel = () => {
  const selectedStepId = useEditorStore((state) => state.selectedStepId);
  const flowData = useEditorStore((state) => state.flowData);
  const gameFlags = useEditorStore((state) => state.gameFlags);
  const updateStep = useEditorStore((state) => state.updateStep);

  // フィールドエディタ (ResourceSelector 等) が候補表示に使うリソースを flowData と
  // seed gameFlags (フラグパネル) から供給する。
  const resources = useMemo(
    () => collectResourcesFromFlow(flowData, gameFlags),
    [flowData, gameFlags],
  );
  const step = selectedStepId === null ? undefined : findStep(flowData, selectedStepId);

  if (step === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-base-content/40">
        ステップを選択してください
      </div>
    );
  }

  return (
    <StepDetail
      step={step}
      resources={resources}
      onChange={(patch) => updateStep(step.id, patch)}
    />
  );
};
