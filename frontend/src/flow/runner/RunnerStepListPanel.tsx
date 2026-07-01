import type { RunHandlers } from "./types";

import { useRunnerStore } from "../store/runnerStore";
import { RunnerStepList } from "./RunnerStepList";

// 左カラム全体 (execute モード)。セクションを縦に並べ、各セクションのステップリストを描画する。
// edit モードと違いセクションの追加・改名は無く、折りたたみのみ可能。
export const RunnerStepListPanel = ({ handlers }: { handlers: RunHandlers }) => {
  const sections = useRunnerStore((state) => state.flowData.sections);
  const toggleSection = useRunnerStore((state) => state.toggleSection);

  return (
    <div className="flex flex-col gap-4 p-3">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-1 border-b border-base-300 pb-1">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              aria-label={section.collapsed ? "セクションを展開" : "セクションを折りたたむ"}
              onClick={() => toggleSection(section.id)}
            >
              {section.collapsed ? "▶" : "▼"}
            </button>
            <span className="flex-1 font-semibold">{section.title || "(無題のセクション)"}</span>
          </div>
          {!section.collapsed && <RunnerStepList steps={section.steps} handlers={handlers} />}
        </div>
      ))}
      {sections.length === 0 && (
        <p className="px-2 py-1 text-sm text-base-content/40">セクションがありません</p>
      )}
    </div>
  );
};
