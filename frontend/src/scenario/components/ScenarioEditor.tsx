import { useEffect, useMemo, useRef, useState } from "react";

import type { Template } from "@/db";
import { StepDetail } from "@/flow/components/DetailPanel";
import { FlagPanelView } from "@/flow/components/FlagPanel";
import { MessageAttachmentTargetProvider } from "@/flow/components/messageContext";
import { collectResourcesFromSteps } from "@/flow/resources";
import type { Step } from "@/flow/schema";
import { findStepIn } from "@/flow/treeOps";

import { ScenarioDataSchema } from "../schema";
import { useScenarioEditorStore } from "../store/editorStore";
import { BlockDocument } from "./BlockDocument";
import { TableOfContents } from "./TableOfContents";

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_INDICATOR_MS = 2000;

type SaveState = "saved" | "invalid" | "error" | null;

// blocks / gameFlags の変更を debounce して Template に保存する。
// 保存要求には世代番号を振り、update() の解決順が前後しても最新要求の結果だけを
// UI に反映する (遅延した "保存しました" が後続の "未保存" を上書きしない)。
const useAutosave = (template: Template): SaveState => {
  const [saveState, setSaveState] = useState<SaveState>(null);

  // 毎保存で useLiveQuery が template を差し替えても購読を張り直さないよう、
  // 購読 effect は template.id でのみ依存し、最新レコードは ref で読む。
  const templateRef = useRef(template);
  templateRef.current = template;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let savedTimeout: ReturnType<typeof setTimeout> | null = null;
    let saveSeq = 0;

    const save = () => {
      const seq = ++saveSeq;
      const { blocks, gameFlags } = useScenarioEditorStore.getState();
      // 編集途中の不完全なブロック (空のロール行など) は保存しない。Template.update が
      // parse で throw して編集が無言で失われるのを防ぎ、「未保存」を明示する。
      const parsed = ScenarioDataSchema.safeParse({ version: 1, blocks });
      if (!parsed.success) {
        // 「未保存」を sticky に保つ (直前の保存成功が予約した自動消去を止める)。
        if (savedTimeout !== null) clearTimeout(savedTimeout);
        savedTimeout = null;
        setSaveState("invalid");
        return;
      }
      templateRef.current
        .update({ scenarioData: parsed.data, gameFlags })
        .then(() => {
          if (seq !== saveSeq) return; // 後続の保存要求が出ていれば古い結果は捨てる
          setSaveState("saved");
          if (savedTimeout !== null) clearTimeout(savedTimeout);
          savedTimeout = setTimeout(() => setSaveState(null), SAVED_INDICATOR_MS);
        })
        .catch((error: unknown) => {
          console.error("Failed to autosave scenarioData:", error);
          if (seq !== saveSeq) return;
          if (savedTimeout !== null) clearTimeout(savedTimeout);
          savedTimeout = null;
          setSaveState("error");
        });
    };

    const unsubscribe = useScenarioEditorStore.subscribe((state, prev) => {
      if (!state.initialized) return;
      if (state.blocks === prev.blocks && state.gameFlags === prev.gameFlags) return;
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(save, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (savedTimeout !== null) clearTimeout(savedTimeout);
      if (timeout === null) return;
      // debounce 待ちのまま画面を離れると、直前の打鍵が無言で消える。
      // タイマーを捨てる前に一度だけ保存し切る。
      clearTimeout(timeout);
      save();
    };
  }, [template.id]);

  return saveState;
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

  const saveState = useAutosave(template);

  return (
    <MessageAttachmentTargetProvider value={{ templateId: template.id }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-2">
          <h2 className="font-semibold">{template.name}</h2>
          <span className="text-xs text-base-content/50">シナリオ編集</span>
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
