import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { memo } from "react";

import type { Step } from "../schema";
import type { StepContainer } from "../treeOps";

import { getEntry } from "../registry";
import { CATEGORY_CLASS, CATEGORY_LABEL } from "../registry/category";
import { useEditorStore } from "../store/editorStore";
import { AddStepMenu } from "./AddStepMenu";

interface StepRowProps {
  step: Step;
}

const StepRow = memo(({ step }: StepRowProps) => {
  const selectStep = useEditorStore((state) => state.selectStep);
  const removeStep = useEditorStore((state) => state.removeStep);
  const selectedStepId = useEditorStore((state) => state.selectedStepId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const entry = getEntry(step.type);
  const isSelected = selectedStepId === step.id;

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div
        className={clsx(
          "flex items-center gap-2 rounded border px-2 py-1",
          isDragging && "opacity-50",
          isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-base-200",
        )}
        onClick={() => selectStep(step.id)}
      >
        <button
          type="button"
          className="cursor-grab px-1 text-base-content/40"
          aria-label="ドラッグして並べ替え"
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        {entry !== undefined && (
          <span className={clsx("badge badge-sm shrink-0", CATEGORY_CLASS[entry.category])}>
            {CATEGORY_LABEL[entry.category]}
          </span>
        )}
        <span className="flex-1 truncate text-sm">
          {step.title.trim() !== ""
            ? step.title
            : entry !== undefined
              ? entry.summary(step)
              : step.type}
        </span>
        {step.autoAdvance && (
          <span className="badge badge-ghost badge-sm shrink-0" title="実行後に次を自動実行">
            ⏩
          </span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          aria-label="ステップを削除"
          onClick={(event) => {
            event.stopPropagation();
            removeStep(step.id);
          }}
        >
          ✕
        </button>
      </div>
      {step.type === "Branch" && (
        <div className="ml-3 mt-1 flex flex-col gap-1 border-l-2 border-base-300 pl-2">
          {step.branches.map((arm) => (
            <div key={arm.id} className="flex flex-col gap-1">
              <span className="text-xs text-base-content/60">
                ▸ {arm.label || "(無名の枝)"}
                {arm.condition === undefined ? " (デフォルト)" : ""}
              </span>
              <StepList
                container={{ kind: "branchArm", branchStepId: step.id, armId: arm.id }}
                steps={arm.steps}
              />
              <AddStepMenu
                container={{ kind: "branchArm", branchStepId: step.id, armId: arm.id }}
                index={arm.steps.length}
              />
            </div>
          ))}
        </div>
      )}
    </li>
  );
});
StepRow.displayName = "StepRow";

interface StepListProps {
  container: StepContainer;
  steps: Step[];
}

export const StepList = ({ container, steps }: StepListProps) => {
  const moveStep = useEditorStore((state) => state.moveStep);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const newIndex = steps.findIndex((step) => step.id === over.id);
    if (newIndex < 0) return;
    moveStep(String(active.id), { container, index: newIndex });
  };

  if (steps.length === 0) {
    return <p className="px-2 py-1 text-xs text-base-content/40">(ステップなし)</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
