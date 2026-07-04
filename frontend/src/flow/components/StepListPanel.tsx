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

import type { Section } from "../treeOps";

import { useEditorStore } from "../store/editorStore";
import { AddStepMenu } from "./AddStepMenu";
import { SectionHeader } from "./SectionHeader";
import { StepList } from "./StepList";

// セクション 1 つ分。dnd-kit の並べ替え対象。ステップリストの並べ替えは各 StepList が
// 自前の DndContext で担うため、ここはセクション単位の並べ替えだけを扱う。
const SortableSection = ({ section }: { section: Section }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
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

// 左カラム全体。セクションを縦に並べ、各セクションにステップリストと追加メニューを置く。
export const StepListPanel = () => {
  const sections = useEditorStore((state) => state.flowData.sections);
  const addSection = useEditorStore((state) => state.addSection);
  const moveSection = useEditorStore((state) => state.moveSection);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const newIndex = sections.findIndex((section) => section.id === over.id);
    if (newIndex < 0) return;
    moveSection(String(active.id), newIndex);
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSection key={section.id} section={section} />
          ))}
        </SortableContext>
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
