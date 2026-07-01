import { useEditorStore } from "../store/editorStore";
import { AddStepMenu } from "./AddStepMenu";
import { SectionHeader } from "./SectionHeader";
import { StepList } from "./StepList";

// 左カラム全体。セクションを縦に並べ、各セクションにステップリストと追加メニューを置く。
export const StepListPanel = () => {
  const sections = useEditorStore((state) => state.flowData.sections);
  const addSection = useEditorStore((state) => state.addSection);

  return (
    <div className="flex flex-col gap-4 p-3">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-2">
          <SectionHeader section={section} />
          {!section.collapsed && (
            <>
              <StepList
                container={{ kind: "section", sectionId: section.id }}
                steps={section.steps}
              />
              <AddStepMenu
                container={{ kind: "section", sectionId: section.id }}
                index={section.steps.length}
              />
            </>
          )}
        </div>
      ))}
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
