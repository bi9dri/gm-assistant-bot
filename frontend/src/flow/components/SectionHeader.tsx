import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

import type { Section } from "../treeOps";

import { useEditorStore } from "../store/editorStore";

interface SectionHeaderProps {
  section: Section;
  // dnd-kit の並べ替えハンドル。StepListPanel の SortableSection から配線される。
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
}

export const SectionHeader = ({ section, dragHandleProps }: SectionHeaderProps) => {
  const updateSection = useEditorStore((state) => state.updateSection);
  const removeSection = useEditorStore((state) => state.removeSection);

  return (
    <div className="flex items-center gap-1 border-b border-base-300 pb-1">
      {dragHandleProps !== undefined && (
        <button
          type="button"
          className="cursor-grab px-1 text-base-content/40"
          aria-label="ドラッグしてセクションを並べ替え"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          ⠿
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label={section.collapsed ? "セクションを展開" : "セクションを折りたたむ"}
        onClick={() => updateSection(section.id, { collapsed: !section.collapsed })}
      >
        {section.collapsed ? "▶" : "▼"}
      </button>
      <input
        type="text"
        className="input input-ghost input-sm flex-1 font-semibold"
        value={section.title}
        placeholder="セクション名"
        onChange={(event) => updateSection(section.id, { title: event.target.value })}
      />
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label="セクションを削除"
        onClick={() => removeSection(section.id)}
      >
        ✕
      </button>
    </div>
  );
};
