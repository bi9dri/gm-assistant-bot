import { useMemo } from "react";

import type { StepRegistryEntry } from "../registry/types";
import type { Step } from "../schema";
import type { StepContainer } from "../treeOps";

import { getEntry, stepTypes } from "../registry";
import { useEditorStore } from "../store/editorStore";

interface MenuItem {
  type: Step["type"];
  category: StepRegistryEntry["category"];
  label: string;
}

const CATEGORY_ORDER: StepRegistryEntry["category"][] = ["action", "branch", "tool"];
const CATEGORY_LABEL: Record<StepRegistryEntry["category"], string> = {
  action: "操作",
  branch: "分岐",
  tool: "ツール",
};

export const AddStepMenu = ({ container, index }: { container: StepContainer; index: number }) => {
  const addStep = useEditorStore((state) => state.addStep);

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
        ＋ ステップを追加
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu z-10 max-h-80 w-56 flex-nowrap overflow-y-auto rounded bg-base-100 p-2 shadow"
      >
        {CATEGORY_ORDER.map((category) => (
          <li key={category}>
            <h4 className="menu-title">{CATEGORY_LABEL[category]}</h4>
            <ul>
              {items
                .filter((item) => item.category === category)
                .map((item) => (
                  <li key={item.type}>
                    <button type="button" onClick={() => addStep(item.type, { container, index })}>
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
