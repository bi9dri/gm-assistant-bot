import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRef, useState, type DragEvent } from "react";

import { dropLocation, getDragData } from "@/flow/components/dnd";
import { StepRowOverlay } from "@/flow/components/StepList";
import type { Step } from "@/flow/schema";
import { findStepIn } from "@/flow/treeOps";
import { useToast } from "@/toast/ToastProvider";

import { sameBlockContainer, type BlockContainer } from "../blockOps";
import { useScenarioEditorStore } from "../store/editorStore";
import { isImportableTextFile, splitTextBlocks } from "../textTransfer";
import { AddBlockMenu, BlockList } from "./BlockList";

const ROOT: BlockContainer = { kind: "root" };

// 畳まれた見出しの中身は <details> に隠れているだけで DOM には残る (D22 の全文検索を
// 効かせるため)。矩形を持たないそれらに落ちると、ブロックが見えない場所へ移動して
// しまうので、衝突候補から外す。
const visibleCollisionDetection: CollisionDetection = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((droppable) => {
      const element = droppable.node.current;
      return element === null || element.closest("details:not([open])") === null;
    }),
  });

// ドキュメント本体のカラム。DndContext はここに 1 つだけ置き、ルートと分岐枝を跨いだ
// 並べ替えを 1 つの文脈で扱う (ステップリスト UI の StepListPanel と同じ構え)。
export const BlockDocument = () => {
  const blocks = useScenarioEditorStore((state) => state.blocks);
  const moveBlock = useScenarioEditorStore((state) => state.moveBlock);
  const restoreBlocks = useScenarioEditorStore((state) => state.restoreBlocks);
  const appendTextBlocks = useScenarioEditorStore((state) => state.appendTextBlocks);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { addToast } = useToast();

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const activeBlock = activeBlockId === null ? undefined : findStepIn(blocks, activeBlockId);
  // onDragOver がコンテナ跨ぎを store に先行反映するため、Escape キャンセル時に
  // 差し戻すドラッグ開始時点のスナップショットを保持する。
  const dragStartBlocks = useRef<Step[] | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    dragStartBlocks.current = useScenarioEditorStore.getState().blocks;
    setActiveBlockId(String(event.active.id));
  };

  // コンテナ (ルート / 分岐枝) を跨いだ瞬間に reparent を store へ反映する。
  // 同一コンテナ内の並べ替えは SortableContext の strategy が見た目を担い、
  // 確定は onDragEnd で行う。
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const activeData = getDragData<BlockContainer>(active);
    if (activeData?.kind !== "step") return;
    const to = dropLocation(getDragData<BlockContainer>(over));
    if (to === undefined || sameBlockContainer(activeData.container, to.container)) return;
    moveBlock(String(active.id), to);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    dragStartBlocks.current = null;
    setActiveBlockId(null);
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const to = dropLocation(getDragData<BlockContainer>(over));
    if (to !== undefined) moveBlock(String(active.id), to);
  };

  const handleDragCancel = () => {
    if (dragStartBlocks.current !== null) restoreBlocks(dragStartBlocks.current);
    dragStartBlocks.current = null;
    setActiveBlockId(null);
  };

  // ファイルのドロップ (docs: scenario-editor-architecture D19)。dnd-kit はポインタ
  // イベントで並べ替えるため、ネイティブのドラッグ&ドロップとは干渉しない。
  const handleFileDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("Files")) event.preventDefault();
  };

  const importTextFiles = async (files: File[]) => {
    try {
      const texts = await Promise.all(
        // fatal 指定で復号し、Shift_JIS を文字化けしたまま取り込んで保存するのを防ぐ。
        files.map(async (file) =>
          new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()),
        ),
      );
      appendTextBlocks(texts.flatMap(splitTextBlocks));
    } catch {
      // 読み込み失敗を黙って捨てると、ドロップしても何も起きないように見える。
      addToast({
        message: "ファイルを取り込めませんでした (UTF-8 のテキストのみ)",
        status: "error",
        durationSeconds: 5,
      });
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    // 取り込めない種類でもブラウザの既定動作 (ファイルを開いて編集中の画面を離れる) は止める。
    event.preventDefault();
    // dataTransfer は await を跨ぐと空になるため、ここで取り出しておく。
    const files = Array.from(event.dataTransfer.files).filter(isImportableTextFile);
    if (files.length === 0) return;
    void importTextFiles(files);
  };

  return (
    <div className="p-3" onDragOver={handleFileDragOver} onDrop={handleFileDrop}>
      <DndContext
        sensors={sensors}
        collisionDetection={visibleCollisionDetection}
        // reparent で要素が動いた後も矩形を測り直す (コンテナ跨ぎ dnd の定石)。
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <BlockList blocks={blocks} container={ROOT} />
        <DragOverlay>
          {activeBlock !== undefined && <StepRowOverlay step={activeBlock} />}
        </DragOverlay>
      </DndContext>
      <div className="flex flex-col gap-1 pt-2">
        <AddBlockMenu container={ROOT} index={blocks.length} />
        <p className="text-xs text-base-content/40">
          .txt / .md をこの列にドロップすると、空行区切りで本文ブロックとして取り込みます
        </p>
      </div>
    </div>
  );
};
