import { useMemo } from "react";

import { getEntry, stepTypes } from "../registry";
import { CATEGORY_LABEL } from "../registry/category";
import type { StepRegistryEntry } from "../registry/types";
import type { Step } from "../schema";
import { useEditorStore } from "../store/editorStore";
import type { StepContainer } from "../treeOps";

interface MenuItem {
  type: Step["type"];
  category: StepRegistryEntry["category"];
  label: string;
}

// text カテゴリ (本文・見出し) はシナリオドキュメント UI 専用のため、ここには並べない
// (docs: scenario-editor-architecture D15)。
const CATEGORY_ORDER: StepRegistryEntry["category"][] = ["action", "branch", "tool"];

interface StepTypeMenuProps {
  label: string;
  categories: StepRegistryEntry["category"][];
  onPick: (type: Step["type"]) => void;
}

// registry からステップタイプをカテゴリ別に並べるドロップダウン。
// 並べるカテゴリと挿入先の決め方は呼び出し側 (UI ごと) が決める。
export const StepTypeMenu = ({ label, categories, onPick }: StepTypeMenuProps) => {
  const items = useMemo<MenuItem[]>(
    () =>
      stepTypes().flatMap((type) => {
        const entry = getEntry(type);
        return entry === undefined
          ? []
          : [{ type, category: entry.category, label: entry.defaults().title }];
      }),
    [],
  );

  return (
    <div className="dropdown w-full">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-xs w-full justify-start text-base-content/60"
      >
        {label}
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu z-10 max-h-80 w-56 flex-nowrap overflow-y-auto rounded bg-base-100 p-2 shadow"
      >
        {categories.map((category) => (
          <li key={category}>
            <h4 className="menu-title">{CATEGORY_LABEL[category]}</h4>
            <ul>
              {items
                .filter((item) => item.category === category)
                .map((item) => (
                  <li key={item.type}>
                    <button type="button" onClick={() => onPick(item.type)}>
                      {item.label}
                    </button>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const AddStepMenu = ({ container, index }: { container: StepContainer; index: number }) => {
  const addStep = useEditorStore((state) => state.addStep);

  return (
    <StepTypeMenu
      label="＋ ステップを追加"
      categories={CATEGORY_ORDER}
      onPick={(type) => addStep(type, { container, index })}
    />
  );
};
