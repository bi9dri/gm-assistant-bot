import { useEffect, useState } from "react";

import type { Template } from "@/db";

import { useEditorStore } from "../store/editorStore";
import { DetailPanel } from "./DetailPanel";
import { FlagPanel } from "./FlagPanel";
import { MessageAttachmentTargetProvider } from "./messageContext";
import { StepListPanel } from "./StepListPanel";

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_INDICATOR_MS = 2000;

// edit モードの 3 カラムレイアウト + store 初期化 + flowData/gameFlags の自動保存。
export const StepsEditor = ({ template }: { template: Template }) => {
  const initialize = useEditorStore((state) => state.initialize);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  // template 切り替え時に store を初期化する。
  useEffect(() => {
    if (loadedId === template.id) return;
    initialize(template.getParsedFlowData(), template.getParsedGameFlags());
    setLoadedId(template.id);
  }, [template, loadedId, initialize]);

  // flowData / gameFlags の変更を debounce して Template に保存する。
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let savedTimeout: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (state.flowData === prev.flowData && state.gameFlags === prev.gameFlags) return;
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const { flowData, gameFlags } = useEditorStore.getState();
        template
          .update({ flowData, gameFlags })
          .then(() => {
            setShowSaved(true);
            if (savedTimeout !== null) clearTimeout(savedTimeout);
            savedTimeout = setTimeout(() => setShowSaved(false), SAVED_INDICATOR_MS);
          })
          .catch((error: unknown) => {
            console.error("Failed to autosave flowData:", error);
          });
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timeout !== null) clearTimeout(timeout);
      if (savedTimeout !== null) clearTimeout(savedTimeout);
    };
  }, [template]);

  return (
    <MessageAttachmentTargetProvider value={{ templateId: template.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{template.name}</h2>
          <span className="text-xs text-base-content/50">ステップリスト編集</span>
          {showSaved && <span className="badge badge-success badge-sm">保存しました</span>}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(360px,1.4fr)_minmax(240px,0.8fr)] divide-x divide-base-300">
          <div className="min-h-0 overflow-y-auto">
            <StepListPanel />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <DetailPanel />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <FlagPanel />
          </div>
        </div>
      </div>
    </MessageAttachmentTargetProvider>
  );
};
