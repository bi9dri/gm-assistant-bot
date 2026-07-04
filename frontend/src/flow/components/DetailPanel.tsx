import { useMemo } from "react";

import { TemplateResourcesOverrideProvider } from "@/components/Node/utils/useTemplateResources";

import type { Step } from "../schema";

import { getEntry } from "../registry";
import { collectResourcesFromFlow } from "../resources";
import { useEditorStore } from "../store/editorStore";
import { findStep } from "../treeOps";

// 中央カラム。選択中ステップの共通フィールド + registry[type].DetailPanel をレンダリングする。
// DetailPanel は store に触れず onChange(patch) を返すだけ。配線はここで updateStep に繋ぐ。
export const DetailPanel = () => {
  const selectedStepId = useEditorStore((state) => state.selectedStepId);
  const flowData = useEditorStore((state) => state.flowData);
  const updateStep = useEditorStore((state) => state.updateStep);

  // フィールドエディタ (ResourceSelector 等) が候補表示に使うリソースを flowData から供給する。
  const resources = useMemo(() => collectResourcesFromFlow(flowData), [flowData]);
  const step = selectedStepId === null ? undefined : findStep(flowData, selectedStepId);

  if (step === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-base-content/40">
        ステップを選択してください
      </div>
    );
  }

  const entry = getEntry(step.type);
  const StepDetailPanel = entry?.DetailPanel;
  const handleChange = (patch: Partial<Step>) => updateStep(step.id, patch);

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
              onChange={(event) => handleChange({ title: event.target.value })}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">メモ</legend>
            <textarea
              className="textarea w-full"
              rows={2}
              value={step.memo}
              placeholder="GM 向けメモ"
              onChange={(event) => handleChange({ memo: event.target.value })}
            />
          </fieldset>
          <label className="label w-fit cursor-pointer gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={step.autoAdvance}
              onChange={(event) => handleChange({ autoAdvance: event.target.checked })}
            />
            実行後に次のステップを自動実行
          </label>
        </div>
        {StepDetailPanel === undefined ? (
          <p className="text-sm text-warning">未対応のステップタイプです: {step.type}</p>
        ) : (
          <>
            <div className="divider my-0" />
            <StepDetailPanel step={step} onChange={handleChange} />
          </>
        )}
      </div>
    </TemplateResourcesOverrideProvider>
  );
};
