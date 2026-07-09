import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useRef, useState } from "react";

import type { FlowData } from "../schema";
import type { Section } from "../treeOps";

import { useEditorStore } from "../store/editorStore";
import { findStep } from "../treeOps";
import { AddStepMenu } from "./AddStepMenu";
import { type DragData, dropLocation, getDragData, sameContainer } from "./dnd";
import { SectionHeader } from "./SectionHeader";
import { StepList, StepRowOverlay } from "./StepList";

// セクション 1 つ分。dnd-kit の並べ替え対象。
const SortableSection = ({ section }: { section: Section }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { kind: "section" } satisfies DragData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("flex flex-col gap-2", isDragging && "opacity-50")}
    >
      <SectionHeader section={section} dragHandleProps={{ attributes, listeners }} />
      {!section.collapsed && (
        <>
          <StepList container={{ kind: "section", sectionId: section.id }} steps={section.steps} />
          <AddStepMenu
            container={{ kind: "section", sectionId: section.id }}
            index={section.steps.length}
          />
        </>
      )}
    </div>
  );
};

// 単一 DndContext にセクションとステップが同居するため、ドラッグ中の要素の種別で
// 衝突候補を絞る。セクションはセクション同士のみ、ステップはステップ + 空コンテナのみ。
// (セクション全体の矩形をステップの候補に含めると、巨大な矩形が近傍のステップ行に
// 勝ってしまいドロップ先がぶれる。)
const typedCollisionDetection: CollisionDetection = (args) => {
  const activeKind = getDragData(args.active)?.kind;
  const droppableContainers = args.droppableContainers.filter((droppable) => {
    const kind = getDragData(droppable)?.kind;
    return activeKind === "section"
      ? kind === "section"
      : kind === "step" || kind === "emptyContainer";
  });
  return closestCenter({ ...args, droppableContainers });
};

// 左カラム全体。セクションを縦に並べ、各セクションにステップリストと追加メニューを置く。
// DndContext はここに 1 つだけ: セクションの並べ替えと、セクション・分岐枝を跨いだ
// ステップの並べ替えの両方を扱う。
export const StepListPanel = () => {
  const flowData = useEditorStore((state) => state.flowData);
  const addSection = useEditorStore((state) => state.addSection);
  const moveSection = useEditorStore((state) => state.moveSection);
  const moveStep = useEditorStore((state) => state.moveStep);
  const restoreFlowData = useEditorStore((state) => state.restoreFlowData);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sections = flowData.sections;
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const activeStep = activeStepId === null ? undefined : findStep(flowData, activeStepId);
  // onDragOver がコンテナ跨ぎを store に先行反映するため、Escape キャンセル時に
  // 差し戻すドラッグ開始時点のスナップショットを保持する。
  const dragStartFlow = useRef<FlowData | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    dragStartFlow.current = useEditorStore.getState().flowData;
    setActiveStepId(getDragData(event.active)?.kind === "step" ? String(event.active.id) : null);
  };

  // コンテナ (セクション / 分岐枝) を跨いだ瞬間に reparent を store へ反映する。
  // これで移動先リストが隙間を開けて応答する。同一コンテナ内の並べ替えは
  // SortableContext の strategy が見た目を担い、確定は onDragEnd で行う。
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const activeData = getDragData(active);
    if (activeData?.kind !== "step") return;
    const to = dropLocation(getDragData(over));
    if (to === undefined || sameContainer(activeData.container, to.container)) return;
    moveStep(String(active.id), to);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    dragStartFlow.current = null;
    setActiveStepId(null);
    const { active, over } = event;
    if (over === null) return;
    const activeData = getDragData(active);
    if (activeData?.kind === "section") {
      if (active.id === over.id) return;
      const newIndex = sections.findIndex((section) => section.id === over.id);
      if (newIndex >= 0) moveSection(String(active.id), newIndex);
      return;
    }
    if (activeData?.kind !== "step" || active.id === over.id) return;
    const to = dropLocation(getDragData(over));
    if (to !== undefined) moveStep(String(active.id), to);
  };

  const handleDragCancel = () => {
    if (dragStartFlow.current !== null) restoreFlowData(dragStartFlow.current);
    dragStartFlow.current = null;
    setActiveStepId(null);
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <DndContext
        sensors={sensors}
        collisionDetection={typedCollisionDetection}
        // reparent で要素が動いた後も矩形を測り直す (コンテナ跨ぎ dnd の定石)。
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSection key={section.id} section={section} />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeStep !== undefined && <StepRowOverlay step={activeStep} />}
        </DragOverlay>
      </DndContext>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => addSection("新しいセクション")}
      >
        ＋ セクションを追加
      </button>
    </div>
  );
};
