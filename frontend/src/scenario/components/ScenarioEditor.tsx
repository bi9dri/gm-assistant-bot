import { useEffect, useMemo, useState } from "react";

import type { Template } from "@/db";
import { StepDetail } from "@/flow/components/DetailPanel";
import { FlagPanelView } from "@/flow/components/FlagPanel";
import { MessageAttachmentTargetProvider } from "@/flow/components/messageContext";
import { collectResourcesFromSteps } from "@/flow/resources";
import type { Step } from "@/flow/schema";
import { findStepIn } from "@/flow/treeOps";

import { SaveStateBadge, useScenarioAutosave, type AutosaveSource } from "../autosave";
import { useScenarioEditorStore } from "../store/editorStore";
import { BlockDocument } from "./BlockDocument";
import { TableOfContents } from "./TableOfContents";

// 編集モードの保存対象は Template.scenarioData と Template.gameFlags (セッション開始時の seed)。
const editorSource: AutosaveSource = {
  subscribe: (listener) =>
    useScenarioEditorStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (state.blocks === prev.blocks && state.gameFlags === prev.gameFlags) return;
      listener();
    }),
  snapshot: () => {
    const { blocks, gameFlags } = useScenarioEditorStore.getState();
    return { blocks, gameFlags };
  },
};

// 右カラム: 選択ブロックの詳細 (共通フィールド + registry の DetailPanel) とフラグパネル。
// 本文ブロックはインライン編集が主で、ここにはタイトル・メモなどの共通フィールドが出る。
export const SidePanel = ({
  blocks,
  selectedId,
}: {
  blocks: Step[];
  selectedId: string | null;
}) => {
  const gameFlags = useScenarioEditorStore((state) => state.gameFlags);
  const setGameFlag = useScenarioEditorStore((state) => state.setGameFlag);
  const removeGameFlag = useScenarioEditorStore((state) => state.removeGameFlag);
  const updateBlock = useScenarioEditorStore((state) => state.updateBlock);

  const resources = useMemo(
    () => collectResourcesFromSteps(blocks, gameFlags),
    [blocks, gameFlags],
  );
  const block = selectedId === null ? undefined : findStepIn(blocks, selectedId);

  return (
    <div className="flex flex-col">
      {block === undefined ? (
        <p className="p-4 text-sm text-base-content/40">ブロックを選択してください</p>
      ) : (
        <StepDetail
          step={block}
          resources={resources}
          onChange={(patch) => updateBlock(block.id, patch)}
        />
      )}
      <div className="divider my-0" />
      <FlagPanelView
        gameFlags={gameFlags}
        setGameFlag={setGameFlag}
        removeGameFlag={removeGameFlag}
      />
    </div>
  );
};

// 編集モードのレイアウト (目次 + ドキュメント + 詳細/フラグ) と store 初期化・自動保存。
export const ScenarioEditor = ({ template }: { template: Template }) => {
  const initialize = useScenarioEditorStore((state) => state.initialize);
  const blocks = useScenarioEditorStore((state) => state.blocks);
  const selectedBlockId = useScenarioEditorStore((state) => state.selectedBlockId);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  // template 切り替え時に store を初期化する。effect の登録順がそのまま実行順になるため、
  // 自動保存の購読より前に置く。逆だと initialize が購読を発火させ、開いただけで
  // 保存が走る (updatedAt が動き、壊れた scenarioData が空で上書きされる)。
  useEffect(() => {
    if (loadedId === template.id) return;
    initialize(template.getParsedScenarioData().blocks, template.getParsedGameFlags());
    setLoadedId(template.id);
  }, [template, loadedId, initialize]);

  const saveState = useScenarioAutosave(template, editorSource);

  return (
    <MessageAttachmentTargetProvider value={{ templateId: template.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{template.name}</h2>
          <span className="text-xs text-base-content/50">シナリオ編集</span>
          <SaveStateBadge saveState={saveState} />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,0.6fr)_minmax(420px,1.8fr)_minmax(280px,1fr)] divide-x divide-base-300">
          <div className="min-h-0 overflow-y-auto">
            <TableOfContents blocks={blocks} />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <BlockDocument />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <SidePanel blocks={blocks} selectedId={selectedBlockId} />
          </div>
        </div>
      </div>
    </MessageAttachmentTargetProvider>
  );
};
