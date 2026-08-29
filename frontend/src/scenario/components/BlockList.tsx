import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { memo } from "react";

import { StepTypeMenu } from "@/flow/components/AddStepMenu";
import { emptyContainerDropId, type DragData } from "@/flow/components/dnd";
import { StepRowContent } from "@/flow/components/StepList";
import { getEntry } from "@/flow/registry";
import type { StepRegistryEntry } from "@/flow/registry/types";
import type { HeadingStep, Step } from "@/flow/schema";

import { sameBlockContainer, type BlockContainer } from "../blockOps";
import { buildOutline, type OutlineNode, type OutlineSection } from "../outline";
import { useScenarioEditorStore } from "../store/editorStore";
import { blockCopyText } from "../textTransfer";
import { CopyButton } from "./CopyButton";

// ドキュメント本体。ブロック列を Heading の階層 (<details>) に沿って描画する。
// 本文ブロックは InlineBody でインライン編集し、Discord 操作ブロックは 1 行サマリを
// 出して選択時に DetailPanel を開く (docs: scenario-editor-architecture D7 / D22)。

type BlockDragData = DragData<BlockContainer>;

// ブロック追加メニューに並べるカテゴリ。本文が主役なので先頭に置く。
const CATEGORY_ORDER: StepRegistryEntry["category"][] = ["text", "action", "branch", "tool"];

export const AddBlockMenu = ({
  container,
  index,
}: {
  container: BlockContainer;
  index: number;
}) => {
  const addBlock = useScenarioEditorStore((state) => state.addBlock);

  return (
    <StepTypeMenu
      label="＋ ブロックを追加"
      categories={CATEGORY_ORDER}
      onPick={(type) => addBlock(type, { container, index })}
    />
  );
};

// 行の右端に常駐するコピー・複製・削除。行本体のクリック (選択 / details の開閉) とは切り離す。
const RowActions = ({ block }: { block: Step }) => {
  const duplicateBlock = useScenarioEditorStore((state) => state.duplicateBlock);
  const removeBlock = useScenarioEditorStore((state) => state.removeBlock);
  const copyText = blockCopyText(block);

  return (
    <>
      {copyText !== "" && <CopyButton text={copyText} />}
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label="ブロックを複製"
        onClick={() => duplicateBlock(block.id)}
      >
        ⧉
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label="ブロックを削除"
        onClick={() => removeBlock(block.id)}
      >
        ✕
      </button>
    </>
  );
};

interface SortableBlockProps {
  block: Step;
  container: BlockContainer;
  index: number;
  children: React.ReactNode;
}

// 1 ブロック分のドラッグ可能な枠。中身 (本文 / サマリ / 見出し) は呼び出し側が決める。
const SortableBlock = ({ block, container, index, children }: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { kind: "step", container, index } satisfies BlockDragData,
  });

  return (
    <div
      ref={setNodeRef}
      // 目次からの scrollIntoView 用のアンカー。
      id={`block-${block.id}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("flex items-start gap-1", isDragging && "opacity-50")}
    >
      <button
        type="button"
        className="cursor-grab px-1 pt-2 text-base-content/30"
        aria-label="ドラッグして並べ替え"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {children}
    </div>
  );
};

// 本文ブロック (InlineBody を持つ型) と操作ブロック (1 行サマリ) の中身。
const BlockBody = ({ block }: { block: Step }) => {
  const selectBlock = useScenarioEditorStore((state) => state.selectBlock);
  const updateBlock = useScenarioEditorStore((state) => state.updateBlock);
  const isSelected = useScenarioEditorStore((state) => state.selectedBlockId === block.id);
  const entry = getEntry(block.type);
  const InlineBody = entry?.InlineBody;

  if (InlineBody !== undefined) {
    return (
      <div className="flex-1" onFocus={() => selectBlock(block.id)}>
        <InlineBody step={block} onChange={(patch) => updateBlock(block.id, patch)} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={clsx(
        "flex flex-1 items-center gap-2 rounded border px-2 py-1 text-left",
        isSelected ? "border-primary bg-primary/10" : "border-base-300 hover:bg-base-200",
      )}
      onClick={() => selectBlock(block.id)}
    >
      <StepRowContent step={block} />
    </button>
  );
};

// Branch の枝。中は同じブロック列なので再帰する (ネストは Branch のみ・docs: scenario-editor-architecture D8)。
const BranchArms = ({ block }: { block: Step }) => {
  if (block.type !== "Branch") return null;

  return (
    <div className="ml-6 mt-1 flex flex-col gap-1 border-l-2 border-base-300 pl-3">
      {block.branches.map((arm) => {
        const container: BlockContainer = {
          kind: "branchArm",
          branchStepId: block.id,
          armId: arm.id,
        };
        return (
          <div key={arm.id} className="flex flex-col gap-1">
            <span className="text-xs text-base-content/60">
              ▸ {arm.label || "(無名の枝)"}
              {arm.condition === undefined ? " (デフォルト)" : ""}
            </span>
            <BlockList blocks={arm.steps} container={container} />
            <AddBlockMenu container={container} index={arm.steps.length} />
          </div>
        );
      })}
    </div>
  );
};

const BlockNode = memo(
  ({ block, container, index }: { block: Step; container: BlockContainer; index: number }) => (
    <div>
      <SortableBlock block={block} container={container} index={index}>
        <BlockBody block={block} />
        <RowActions block={block} />
      </SortableBlock>
      <BranchArms block={block} />
    </div>
  ),
  // container は親の render ごとに新しいオブジェクトになるため値で比較する。
  (prev, next) =>
    prev.block === next.block &&
    prev.index === next.index &&
    sameBlockContainer(prev.container, next.container),
);
BlockNode.displayName = "BlockNode";

// 見出し 1 つ分。<details> で折りたたむ (ブラウザの検索が畳んだ中を自動で開く・docs: scenario-editor-architecture D22)。
const SectionNode = ({
  section,
  container,
}: {
  section: OutlineSection;
  container: BlockContainer;
}) => {
  const updateBlock = useScenarioEditorStore((state) => state.updateBlock);

  return (
    <details
      className="rounded border border-base-200 px-2 py-1"
      open={!section.heading.collapsed}
      onToggle={(event) => {
        const patch: Partial<HeadingStep> = { collapsed: !event.currentTarget.open };
        updateBlock(section.heading.id, patch);
      }}
    >
      {/* summary 内の操作 (入力・ドラッグ・ボタン) では開閉させない。開閉はマーカー側で行う。 */}
      <summary className="cursor-pointer">
        <span
          className="inline-flex w-[calc(100%-1.5rem)] items-start gap-1 align-top"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <SortableBlock block={section.heading} container={container} index={section.index}>
            <BlockBody block={section.heading} />
            <RowActions block={section.heading} />
          </SortableBlock>
        </span>
      </summary>
      <div className="ml-2 flex flex-col gap-1 border-l border-base-200 pl-2">
        <BlockNodes nodes={section.children} container={container} />
      </div>
    </details>
  );
};

const BlockNodes = ({ nodes, container }: { nodes: OutlineNode[]; container: BlockContainer }) => (
  <>
    {nodes.map((node) =>
      node.kind === "block" ? (
        <BlockNode
          key={node.block.id}
          block={node.block}
          container={container}
          index={node.index}
        />
      ) : (
        <SectionNode key={node.heading.id} section={node} container={container} />
      ),
    )}
  </>
);

// 空のコンテナ (枝など) にもドラッグで移動できるようにする。
const EmptyDropZone = ({ container }: { container: BlockContainer }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: emptyContainerDropId(container),
    data: { kind: "emptyContainer", container } satisfies BlockDragData,
  });

  return (
    <p
      ref={setNodeRef}
      className={clsx(
        "rounded border border-dashed px-2 py-1 text-xs text-base-content/40",
        isOver ? "border-primary bg-primary/10" : "border-transparent",
      )}
    >
      (ブロックなし)
    </p>
  );
};

interface BlockListProps {
  blocks: Step[];
  container: BlockContainer;
}

// コンテナ 1 つ分のブロック列。DndContext は持たない (ScenarioEditor に 1 つだけ置き、
// 枝を跨いだ並べ替えを可能にする)。
export const BlockList = ({ blocks, container }: BlockListProps) => {
  if (blocks.length === 0) return <EmptyDropZone container={container} />;

  return (
    <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-1">
        <BlockNodes nodes={buildOutline(blocks)} container={container} />
      </div>
    </SortableContext>
  );
};
