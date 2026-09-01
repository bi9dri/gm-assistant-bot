import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { useScenarioDocument } from "../editor/useScenarioDocument";
import { restartFromHeading, resumeCursorId, runnerSteps, toRunnerFlow } from "../runner";
import { emptyDoc } from "../schema";
import { scrollToStep } from "../scrollTo";
import { ScenarioChipsProvider } from "./chips";
import { RunHandlersProvider, RunnerBranchBlock, RunnerStepChip } from "./RunnerChips";
import { ScenarioDocument } from "./ScenarioDocument";
import { TableOfContents } from "./TableOfContents";

// 実行モードの本文は読み取り専用 (docs: scenario-editor-architecture フェーズ 3)。
// 保存対象は GameSession.scenarioData (doc はそのまま、steps は実行痕跡が乗ったもの) と
// ライブの GameSession.gameFlags。
const runnerSource = (doc: JSONContent): AutosaveSource => ({
  subscribe: (listener) =>
    useRunnerStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (state.flowData === prev.flowData && state.gameFlags === prev.gameFlags) return;
      listener();
    }),
  snapshot: () => {
    const { flowData, gameFlags } = useRunnerStore.getState();
    return { doc, steps: runnerSteps(flowData), gameFlags };
  },
});

const CHIPS = { Step: RunnerStepChip, Branch: RunnerBranchBlock };

// 読み込み前のプレースホルダ。毎レンダー作ると autosave の source が張り直される。
const EMPTY_DOC = emptyDoc();

// シナリオ実行画面 (docs: scenario-editor-architecture D10 / D16)。
// 目次 + 本文 + 詳細/フラグ/ツールの 3 カラムで、編集画面と同じ並びにする。
export const ScenarioRunner = ({ session, bot }: { session: GameSession; bot: DiscordBotData }) => {
  const initialize = useRunnerStore((state) => state.initialize);
  const setCursor = useRunnerStore((state) => state.setCursor);
  const skipStep = useRunnerStore((state) => state.skipStep);
  const cursorId = useRunnerStore((state) => state.cursorId);
  const [loaded, setLoaded] = useState<{ id: number; doc: JSONContent } | null>(null);
  const { runStep } = useSessionRunner(session, bot);

  // session 切り替え時に store を初期化する。effect の登録順がそのまま実行順になるため、
  // 自動保存の購読より前に置く (逆だと開いただけで保存が走る)。
  useEffect(() => {
    if (loaded?.id === session.id) return;
    const { doc, steps } = session.getParsedScenarioData();
    initialize(toRunnerFlow(steps), coerceFlags(session.getParsedGameFlags()));
    setCursor(resumeCursorId(steps));
    setLoaded({ id: session.id, doc });
  }, [session, loaded, initialize, setCursor]);

  const doc = loaded?.doc ?? EMPTY_DOC;
  // source が毎レンダー変わると autosave が購読を張り直し、debounce が効かなくなる。
  const source = useMemo(() => runnerSource(doc), [doc]);
  const saveState = useScenarioAutosave(session, source);
  const editor = useScenarioDocument({ doc, editable: false, recordKey: loaded?.id ?? null });

  // カーソルが動いたらその位置へスクロールを追従させる (D10)。
  useEffect(() => {
    if (cursorId !== null) scrollToStep(cursorId);
  }, [cursorId]);

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
            <TableOfContents
              doc={doc}
              onRestart={(headingIndex) => restartFromHeading(doc, headingIndex)}
            />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <RunHandlersProvider value={handlers}>
              <ScenarioChipsProvider value={CHIPS}>
                <ScenarioDocument editor={editor} />
              </ScenarioChipsProvider>
            </RunHandlersProvider>
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
