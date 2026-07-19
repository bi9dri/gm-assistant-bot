import { useDroppable } from "@dnd-kit/core";
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
import { type DragData, emptyContainerDropId, sameContainer } from "./dnd";

// 行の中身 (カテゴリバッジ + タイトル + autoAdvance)。リスト行と DragOverlay で共用する。
const StepRowContent = ({ step }: { step: Step }) => {
  const entry = getEntry(step.type);
  return (
    <>
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
    </>
  );
};

// DragOverlay 用: ドラッグ中ポインタに追従する行の複製。
// コンテナを跨ぐ移動では行が DOM 上で親を移る (remount) ため、
// 元要素へ transform を当てる方式だと追従が途切れる。
export const StepRowOverlay = ({ step }: { step: Step }) => (
  <div className="flex items-center gap-2 rounded border border-primary bg-base-100 px-2 py-1 shadow-lg">
    <span className="px-1 text-base-content/40">⠿</span>
    <StepRowContent step={step} />
  </div>
);

interface StepRowProps {
  step: Step;
  container: StepContainer;
  index: number;
}

const StepRow = memo(
  ({ step, container, index }: StepRowProps) => {
    const selectStep = useEditorStore((state) => state.selectStep);
    const duplicateStep = useEditorStore((state) => state.duplicateStep);
    const removeStep = useEditorStore((state) => state.removeStep);
    const selectedStepId = useEditorStore((state) => state.selectedStepId);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: step.id,
      data: { kind: "step", container, index } satisfies DragData,
    });
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
          <StepRowContent step={step} />
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            aria-label="ステップを複製"
            onClick={(event) => {
              event.stopPropagation();
              duplicateStep(step.id);
            }}
          >
            ⧉
          </button>
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
  },
  // container は親の render ごとに新しいオブジェクトになるため、参照でなく値で比較して
  // memo を効かせる (未変更行の再レンダー回避は D4 の要)。
  (prev, next) =>
    prev.step === next.step &&
    prev.index === next.index &&
    sameContainer(prev.container, next.container),
);
StepRow.displayName = "StepRow";

// 空リストの表示。droppable にして、空のセクションや分岐枝にもステップを
// ドラッグで移動できるようにする。
const EmptyStepDropZone = ({ container }: { container: StepContainer }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: emptyContainerDropId(container),
    data: { kind: "emptyContainer", container } satisfies DragData,
  });

  return (
    <p
      ref={setNodeRef}
      className={clsx(
        "rounded border border-dashed px-2 py-1 text-xs text-base-content/40",
        isOver ? "border-primary bg-primary/10" : "border-transparent",
      )}
    >
      (ステップなし)
    </p>
  );
};

interface StepListProps {
  container: StepContainer;
  steps: Step[];
}

// コンテナ (セクション直下 or 分岐枝) 1 つ分のステップリスト。
// DndContext は持たない — ドラッグは StepListPanel の単一 DndContext が一括で扱い、
// これによりコンテナを跨いだ並べ替えが可能になる。
export const StepList = ({ container, steps }: StepListProps) => {
  if (steps.length === 0) {
    return <EmptyStepDropZone container={container} />;
  }

  return (
    <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col gap-1">
        {steps.map((step, index) => (
          <StepRow key={step.id} step={step} container={container} index={index} />
        ))}
      </ul>
    </SortableContext>
  );
};
