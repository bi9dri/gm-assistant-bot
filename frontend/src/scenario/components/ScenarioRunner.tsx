import { useCallback, useEffect, useState } from "react";

import type { DiscordBotData, GameSession } from "@/db";
import { MessageAttachmentTargetProvider } from "@/flow/components/messageContext";
import { coerceFlags } from "@/flow/runner/flags";
import { RunnerDetailPanel } from "@/flow/runner/RunnerDetailPanel";
import { RunnerFlagPanel } from "@/flow/runner/RunnerFlagPanel";
import { RunnerToolDock } from "@/flow/runner/RunnerToolDock";
import type { RunHandlers } from "@/flow/runner/types";
import { useSessionRunner } from "@/flow/runner/useSessionRunner";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { SaveStateBadge, useScenarioAutosave, type AutosaveSource } from "../autosave";
import { runnerBlocks, toRunnerFlow } from "../runner";
import { RunnerBlockList } from "./RunnerBlockList";
import { TableOfContents } from "./TableOfContents";

// 実行モードの保存対象は GameSession.scenarioData とライブの GameSession.gameFlags。
const runnerSource: AutosaveSource = {
  subscribe: (listener) =>
    useRunnerStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (state.flowData === prev.flowData && state.gameFlags === prev.gameFlags) return;
      listener();
    }),
  snapshot: () => {
    const { flowData, gameFlags } = useRunnerStore.getState();
    return { blocks: runnerBlocks(flowData), gameFlags };
  },
};

// シナリオ実行画面 (docs: scenario-editor-architecture D10 / D16)。
// 目次 + ドキュメント + 詳細/フラグ/ツールの 3 カラムで、編集画面と同じ並びにする。
export const ScenarioRunner = ({ session, bot }: { session: GameSession; bot: DiscordBotData }) => {
  const initialize = useRunnerStore((state) => state.initialize);
  const skipStep = useRunnerStore((state) => state.skipStep);
  const flowData = useRunnerStore((state) => state.flowData);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const { runStep } = useSessionRunner(session, bot);

  // session 切り替え時に store を初期化する。effect の登録順がそのまま実行順になるため、
  // 自動保存の購読より前に置く (逆だと開いただけで保存が走る)。
  useEffect(() => {
    if (loadedId === session.id) return;
    initialize(
      toRunnerFlow(session.getParsedScenarioData().blocks),
      coerceFlags(session.getParsedGameFlags()),
    );
    setLoadedId(session.id);
  }, [session, loadedId, initialize]);

  const saveState = useScenarioAutosave(session, runnerSource);

  const handlers: RunHandlers = {
    onRun: useCallback((stepId, options) => void runStep(stepId, options), [runStep]),
    onSkip: useCallback((stepId: string) => skipStep(stepId), [skipStep]),
  };

  return (
    <MessageAttachmentTargetProvider value={{ sessionId: session.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{session.name}</h2>
          <span className="text-xs text-base-content/50">シナリオ実行</span>
          <SaveStateBadge saveState={saveState} />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,0.6fr)_minmax(420px,1.8fr)_minmax(280px,1fr)] divide-x divide-base-300">
          <div className="min-h-0 overflow-y-auto">
            <TableOfContents blocks={runnerBlocks(flowData)} />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <RunnerBlockList handlers={handlers} />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <RunnerDetailPanel handlers={handlers} />
            <div className="divider my-0" />
            <RunnerFlagPanel />
            <RunnerToolDock />
          </div>
        </div>
      </div>
    </MessageAttachmentTargetProvider>
  );
};
