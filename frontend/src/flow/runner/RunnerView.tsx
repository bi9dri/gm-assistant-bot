import { useCallback, useEffect, useRef, useState } from "react";

import type { DiscordBotData, GameSession } from "@/db";

import type { RunHandlers } from "./types";

import { MessageAttachmentTargetProvider } from "../components/messageContext";
import { FlowDataSchema } from "../schema";
import { useRunnerStore } from "../store/runnerStore";
import { RunnerDetailPanel } from "./RunnerDetailPanel";
import { RunnerFlagPanel } from "./RunnerFlagPanel";
import { RunnerStepListPanel } from "./RunnerStepListPanel";
import { useSessionRunner } from "./useSessionRunner";

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_INDICATOR_MS = 2000;

type SaveState = "saved" | "invalid" | "error" | null;

// ライブフラグは string 値で扱う (evaluateCondition / DynamicValue が string 前提)。
const toFlagString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const coerceFlags = (flags: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(flags).map(([key, value]) => [key, toFlagString(value)]));

// execute モードの 3 カラムレイアウト + store 初期化 + flowData/gameFlags の自動保存。
// edit モードの StepsEditor に対応する execute モード版。
export const RunnerView = ({ session, bot }: { session: GameSession; bot: DiscordBotData }) => {
  const initialize = useRunnerStore((state) => state.initialize);
  const skipStep = useRunnerStore((state) => state.skipStep);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const { runStep } = useSessionRunner(session, bot);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (loadedId === session.id) return;
    initialize(session.getParsedFlowData(), coerceFlags(session.getParsedGameFlags()));
    setLoadedId(session.id);
  }, [session, loadedId, initialize]);

  // flowData / gameFlags の変更を debounce して GameSession に保存する (StepsEditor と同型)。
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let savedTimeout: ReturnType<typeof setTimeout> | null = null;
    let saveSeq = 0;

    const unsubscribe = useRunnerStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (state.flowData === prev.flowData && state.gameFlags === prev.gameFlags) return;
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const seq = ++saveSeq;
        const { flowData, gameFlags } = useRunnerStore.getState();
        const parsed = FlowDataSchema.safeParse(flowData);
        if (!parsed.success) {
          if (savedTimeout !== null) clearTimeout(savedTimeout);
          savedTimeout = null;
          setSaveState("invalid");
          return;
        }
        sessionRef.current
          .update({ flowData, gameFlags })
          .then(() => {
            if (seq !== saveSeq) return;
            setSaveState("saved");
            if (savedTimeout !== null) clearTimeout(savedTimeout);
            savedTimeout = setTimeout(() => setSaveState(null), SAVED_INDICATOR_MS);
          })
          .catch((error: unknown) => {
            console.error("Failed to autosave session flowData:", error);
            if (seq !== saveSeq) return;
            if (savedTimeout !== null) clearTimeout(savedTimeout);
            savedTimeout = null;
            setSaveState("error");
          });
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timeout !== null) clearTimeout(timeout);
      if (savedTimeout !== null) clearTimeout(savedTimeout);
    };
  }, [session.id]);

  const handlers: RunHandlers = {
    onRun: useCallback((stepId, options) => void runStep(stepId, options), [runStep]),
    onSkip: useCallback((stepId) => skipStep(stepId), [skipStep]),
  };

  return (
    <MessageAttachmentTargetProvider value={{ sessionId: session.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{session.name}</h2>
          <span className="text-xs text-base-content/50">ステップ実行</span>
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
            <RunnerStepListPanel handlers={handlers} />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <RunnerDetailPanel handlers={handlers} />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <RunnerFlagPanel />
          </div>
        </div>
      </div>
    </MessageAttachmentTargetProvider>
  );
};
