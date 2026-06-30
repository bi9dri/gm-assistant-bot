import { useEffect, useRef, useState } from "react";

import type { Template } from "@/db";

import { FlowDataSchema } from "../schema";
import { useEditorStore } from "../store/editorStore";
import { DetailPanel } from "./DetailPanel";
import { FlagPanel } from "./FlagPanel";
import { MessageAttachmentTargetProvider } from "./messageContext";
import { StepListPanel } from "./StepListPanel";

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_INDICATOR_MS = 2000;

type SaveState = "saved" | "invalid" | "error" | null;

// edit モードの 3 カラムレイアウト + store 初期化 + flowData/gameFlags の自動保存。
export const StepsEditor = ({ template }: { template: Template }) => {
  const initialize = useEditorStore((state) => state.initialize);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(null);

  // 毎保存で useLiveQuery が template を差し替えても購読を張り直さないよう、
  // 購読 effect は template.id でのみ依存し、最新レコードは ref で読む。
  const templateRef = useRef(template);
  templateRef.current = template;

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
        // FlowDataSchema を満たさない編集途中状態 (空のロール行・空の項目など) は保存しない。
        // Template.update が parse で throw して編集が無言で失われるのを防ぎ、「未保存」を明示する。
        const parsed = FlowDataSchema.safeParse(flowData);
        if (!parsed.success) {
          setSaveState("invalid");
          return;
        }
        templateRef.current
          .update({ flowData, gameFlags })
          .then(() => {
            setSaveState("saved");
            if (savedTimeout !== null) clearTimeout(savedTimeout);
            savedTimeout = setTimeout(() => setSaveState(null), SAVED_INDICATOR_MS);
          })
          .catch((error: unknown) => {
            console.error("Failed to autosave flowData:", error);
            setSaveState("error");
          });
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timeout !== null) clearTimeout(timeout);
      if (savedTimeout !== null) clearTimeout(savedTimeout);
    };
  }, [template.id]);

  return (
    <MessageAttachmentTargetProvider value={{ templateId: template.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{template.name}</h2>
          <span className="text-xs text-base-content/50">ステップリスト編集</span>
          {saveState === "saved" && (
            <span className="badge badge-success badge-sm">保存しました</span>
          )}
          {saveState === "invalid" && (
            <span className="badge badge-warning badge-sm">未保存: 入力に不備があります</span>
          )}
          {saveState === "error" && (
            <span className="badge badge-error badge-sm">保存に失敗しました</span>
          )}
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
