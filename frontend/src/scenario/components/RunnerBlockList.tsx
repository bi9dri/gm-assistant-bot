import clsx from "clsx";
import { useEffect, useState } from "react";

import { StepRowContent } from "@/flow/components/StepList";
import { getEntry } from "@/flow/registry";
import { canRunStep } from "@/flow/runner/canRun";
import type { RunHandlers } from "@/flow/runner/types";
import type { Step } from "@/flow/schema";
import { useRunnerStore } from "@/flow/store/runnerStore";

import { buildOutline, type OutlineNode, type OutlineSection } from "../outline";
import { restartFromHeading, runnerBlocks } from "../runner";
import { scrollToBlock } from "../scrollToBlock";

// 実行モードのドキュメント本体 (docs: scenario-editor-architecture D10)。編集モードの
// BlockList と違い並べ替え・追加・削除は無く、実行状態のマーカーと実行/スキップ/再実行、
// 見出しの「ここから再実行」を持つ。本文ブロックの実行は no-op で、通過印 (executedAt) が
// 付くだけ。「既読」のような別状態は持たせない。

const RunControls = ({ block, handlers }: { block: Step; handlers: RunHandlers }) => {
  const isRunning = useRunnerStore((state) => state.runningStepId !== null);
  const isExecuted = block.executedAt !== undefined;
  // select 分岐は枝を選ばないと実行できない。右カラム (RunnerDetailPanel) の枝ボタンに任せる。
  const canRun = canRunStep(block);

  return (
    <div className="flex shrink-0 items-center gap-1">
      {canRun && (
        <button
          type="button"
          className={clsx("btn btn-xs", isExecuted ? "btn-ghost" : "btn-primary")}
          disabled={isRunning}
          onClick={() => handlers.onRun(block.id)}
        >
          {/* 本文ブロックは Discord 副作用を持たないため「通過」と呼ぶ。 */}
          {isExecuted ? "再実行" : getEntry(block.type)?.category === "text" ? "通過" : "実行"}
        </button>
      )}
      {!isExecuted && (
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={isRunning}
          onClick={() => handlers.onSkip(block.id)}
        >
          スキップ
        </button>
      )}
    </div>
  );
};

// 実行状態のマーカー。実行済み ✓ / スキップ ⏭ / カーソル ▶。
const StateMarker = ({ block }: { block: Step }) => {
  const skipped = useRunnerStore((state) => state.skippedStepIds.includes(block.id));
  const isCursor = useRunnerStore((state) => state.cursorId === block.id);
  const isExecuted = block.executedAt !== undefined;

  if (isExecuted) return <span className="w-4 shrink-0 text-center text-success">✓</span>;
  if (skipped) return <span className="w-4 shrink-0 text-center text-base-content/30">⏭</span>;
  if (isCursor) return <span className="w-4 shrink-0 text-center font-bold text-primary">▶</span>;
  return <span className="w-4 shrink-0" />;
};

// 本文ブロックはインライン、操作ブロックは 1 行サマリ (詳細は右カラム・D7)。
const BlockBody = ({ block }: { block: Step }) => {
  const selectStep = useRunnerStore((state) => state.selectStep);
  const updateStep = useRunnerStore((state) => state.updateStep);
  const isSelected = useRunnerStore((state) => state.selectedStepId === block.id);
  const entry = getEntry(block.type);
  const InlineBody = entry?.InlineBody;

  if (InlineBody !== undefined) {
    return (
      // 実行済みブロックは記録保護で編集させない (store も updateStep で拒否する)。
      <fieldset disabled={block.executedAt !== undefined} className="flex-1">
        <div onFocus={() => selectStep(block.id)}>
          <InlineBody step={block} onChange={(patch) => updateStep(block.id, patch)} />
        </div>
      </fieldset>
    );
  }

  return (
    <button
      type="button"
      className={clsx(
        "flex flex-1 items-center gap-2 rounded border px-2 py-1 text-left",
        isSelected ? "border-primary bg-primary/10" : "border-base-300 hover:bg-base-200",
      )}
      onClick={() => selectStep(block.id)}
    >
      <StepRowContent step={block} />
    </button>
  );
};

interface BlockRowProps {
  block: Step;
  handlers: RunHandlers;
  children?: React.ReactNode;
}

// 1 ブロック分の行。カーソル位置は枠と背景で「今ここ」を大きく出す (D10)。
const BlockRow = ({ block, handlers, children }: BlockRowProps) => {
  const skipped = useRunnerStore((state) => state.skippedStepIds.includes(block.id));
  const isCursor = useRunnerStore((state) => state.cursorId === block.id);
  const isExecuted = block.executedAt !== undefined;

  return (
    <div
      // 目次のクリックとカーソル追従が使うアンカー。
      id={`block-${block.id}`}
      className={clsx(
        "flex items-start gap-2 rounded border px-1 py-1",
        isCursor && !isExecuted ? "border-primary bg-primary/5 shadow" : "border-transparent",
        isExecuted && "bg-success/5",
        skipped && "opacity-50",
      )}
    >
      <StateMarker block={block} />
      <BlockBody block={block} />
      {children}
      <RunControls block={block} handlers={handlers} />
    </div>
  );
};

// Branch の枝。実行済みなら確定した枝だけを展開し、選ばれなかった枝は畳む
// (実行モードのステップリストと同じ見せ方)。
const BranchArms = ({ block, handlers }: { block: Step; handlers: RunHandlers }) => {
  if (block.type !== "Branch") return null;
  const chosen = block.executedBranchIds;

  return (
    <div className="ml-6 mt-1 flex flex-col gap-1 border-l-2 border-base-300 pl-3">
      {block.branches.map((arm) => {
        const isChosen = chosen === undefined || chosen.includes(arm.id);
        if (!isChosen) {
          return (
            <span key={arm.id} className="text-xs text-base-content/30 line-through">
              ▸ {arm.label || "(無名の枝)"}
            </span>
          );
        }
        return (
          <div key={arm.id} className="flex flex-col gap-1">
            <span className="text-xs text-base-content/60">
              ▸ {arm.label || "(無名の枝)"}
              {arm.condition === undefined ? " (デフォルト)" : ""}
            </span>
            <RunnerBlockNodes nodes={buildOutline(arm.steps)} handlers={handlers} />
          </div>
        );
      })}
    </div>
  );
};

const BlockNode = ({ block, handlers }: { block: Step; handlers: RunHandlers }) => (
  <div>
    <BlockRow block={block} handlers={handlers} />
    <BranchArms block={block} handlers={handlers} />
  </div>
);

// 見出し 1 つ分。折りたたみは実行中の見え方の調整でしかないので、記録保護に触れないよう
// ローカル state で持つ (collapsed の書き戻しはしない)。
const SectionNode = ({ section, handlers }: { section: OutlineSection; handlers: RunHandlers }) => {
  const [open, setOpen] = useState(!section.heading.collapsed);

  return (
    <details
      className="rounded border border-base-200 px-2 py-1"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {/* summary 内の操作 (入力・ボタン) では開閉させない。開閉はマーカー側で行う。 */}
      <summary className="cursor-pointer">
        <span
          className="inline-flex w-[calc(100%-1.5rem)] items-start gap-1 align-top"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <BlockRow block={section.heading} handlers={handlers}>
            {/* ループ (docs: scenario-editor-architecture D9)。周回数は Counter ステップで数える。 */}
            <button
              type="button"
              className="btn btn-ghost btn-xs shrink-0"
              title="この見出しの配下の実行・スキップの記録を消して、ここからやり直す"
              onClick={() => restartFromHeading(section.heading.id)}
            >
              ここから再実行
            </button>
          </BlockRow>
        </span>
      </summary>
      <div className="ml-2 flex flex-col gap-1 border-l border-base-200 pl-2">
        <RunnerBlockNodes nodes={section.children} handlers={handlers} />
      </div>
    </details>
  );
};

const RunnerBlockNodes = ({ nodes, handlers }: { nodes: OutlineNode[]; handlers: RunHandlers }) => (
  <>
    {nodes.map((node) =>
      node.kind === "block" ? (
        <BlockNode key={node.block.id} block={node.block} handlers={handlers} />
      ) : (
        <SectionNode key={node.heading.id} section={node} handlers={handlers} />
      ),
    )}
  </>
);

// 実行モードのドキュメントカラム。カーソルが動いたらその行へスクロールを追従させる (D10)。
export const RunnerBlockList = ({ handlers }: { handlers: RunHandlers }) => {
  // セレクタで runnerBlocks を呼ぶと空フローで毎回新しい配列を返し、スナップショットが
  // 安定しなくなる。flowData を購読してから取り出す。
  const flowData = useRunnerStore((state) => state.flowData);
  const cursorId = useRunnerStore((state) => state.cursorId);
  const blocks = runnerBlocks(flowData);

  useEffect(() => {
    if (cursorId !== null) scrollToBlock(cursorId);
  }, [cursorId]);

  if (blocks.length === 0) {
    return <p className="p-3 text-sm text-base-content/40">ブロックがありません</p>;
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      <RunnerBlockNodes nodes={buildOutline(blocks)} handlers={handlers} />
    </div>
  );
};
