import { type Node, type NodeProps } from "@xyflow/react";
import { useRef, useState, useEffect } from "react";
import { HiPencil } from "react-icons/hi";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  cn,
  BaseNodeDataSchema,
  NODE_CONTENT_HEIGHTS,
  NODE_TYPE_WIDTHS,
} from "../base";

// ============================================================
// Schema Definitions
// ============================================================

const KanbanCardSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const KanbanColumnSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const CardPlacementSchema = z.object({
  cardId: z.string(),
  columnId: z.string(),
  movedAt: z.coerce.date(),
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("カンバン"),
  columns: z.array(KanbanColumnSchema).default([]),
  cards: z.array(KanbanCardSchema).default([]),
  unassignedColumnLabel: z.string().default("未配置"),
  cardPlacements: z.array(CardPlacementSchema).default([]),
});

export type KanbanNodeData = z.infer<typeof DataSchema>;
type KanbanNode = Node<KanbanNodeData, "Kanban">;

// ============================================================
// Types
// ============================================================

type KanbanCard = z.infer<typeof KanbanCardSchema>;
type KanbanColumn = z.infer<typeof KanbanColumnSchema>;
type CardPlacement = z.infer<typeof CardPlacementSchema>;

// ============================================================
// Utility Functions
// ============================================================

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================
// Sub Components
// ============================================================

interface EditableTitleProps {
  title: string;
  defaultTitle: string;
  onTitleChange: (newTitle: string) => void;
}

function EditableTitle({ title, defaultTitle, onTitleChange }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(title);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    onTitleChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={inputRef}
          type="text"
          className="nodrag input input-bordered input-xs flex-1 font-semibold"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleConfirm}
          placeholder={defaultTitle}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="font-semibold truncate">{title || defaultTitle}</span>
      <button
        type="button"
        className="nodrag btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100 shrink-0"
        onClick={handleStartEdit}
        title="ノード名を編集"
      >
        <HiPencil className="w-3 h-3" />
      </button>
    </div>
  );
}

interface ItemListEditorProps {
  label: string;
  items: { id: string; label: string }[];
  onItemsChange: (items: { id: string; label: string }[]) => void;
  disabled?: boolean;
  addButtonLabel: string;
}

function ItemListEditor({
  label,
  items,
  onItemsChange,
  disabled,
  addButtonLabel,
}: ItemListEditorProps) {
  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], label: newLabel };
    onItemsChange(updated);
  };

  const handleAdd = () => {
    onItemsChange([...items, { id: generateId(), label: "" }]);
  };

  const handleRemove = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-base-content/70">{label}</div>
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-2 items-center">
          <input
            type="text"
            className="nodrag input input-bordered input-sm flex-1"
            value={item.label}
            onChange={(e) => handleLabelChange(index, e.target.value)}
            placeholder={`${label}名を入力`}
            disabled={disabled}
          />
          {!disabled && (
            <button
              type="button"
              className="nodrag btn btn-ghost btn-sm btn-square"
              onClick={() => handleRemove(index)}
              title="削除"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="nodrag btn btn-ghost btn-sm" onClick={handleAdd}>
          + {addButtonLabel}
        </button>
      )}
    </div>
  );
}

interface KanbanCardComponentProps {
  card: KanbanCard;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  disabled?: boolean;
}

function KanbanCardComponent({ card, onDragStart, disabled }: KanbanCardComponentProps) {
  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, card.id)}
      className={cn(
        "nodrag bg-base-100 rounded px-2 py-1 text-sm shadow-sm border border-base-300",
        !disabled && "cursor-grab hover:bg-base-200 active:cursor-grabbing",
        disabled && "opacity-60",
      )}
    >
      {card.label || "(未入力)"}
    </div>
  );
}

interface KanbanColumnComponentProps {
  column: KanbanColumn | { id: "unassigned"; label: string };
  cards: KanbanCard[];
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: (e: React.DragEvent, columnId: string) => void;
  disabled?: boolean;
}

function KanbanColumnComponent({
  column,
  cards,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  onDragEnter,
  onDragLeave,
  disabled,
}: KanbanColumnComponentProps) {
  return (
    <div className="flex flex-col min-w-28 max-w-36">
      <div className="text-xs font-medium text-base-content/70 mb-1 truncate" title={column.label}>
        {column.label || "(未入力)"}
      </div>
      <div
        className={cn(
          "nodrag flex-1 min-h-20 p-1 rounded border border-dashed space-y-1 overflow-y-auto nowheel",
          isDragOver ? "border-primary bg-primary/10" : "border-base-300 bg-base-200/50",
        )}
        onDragOver={onDragOver}
        onDragEnter={(e) => onDragEnter(e, column.id)}
        onDragLeave={(e) => onDragLeave(e, column.id)}
        onDrop={(e) => onDrop(e, column.id)}
        style={{ maxHeight: "150px" }}
      >
        {cards.map((card) => (
          <KanbanCardComponent
            key={card.id}
            card={card}
            onDragStart={onDragStart}
            disabled={disabled}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-xs text-base-content/30 text-center py-2">ドロップ</div>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  cardPlacements: CardPlacement[];
  unassignedColumnLabel: string;
  onCardMove: (cardId: string, columnId: string) => void;
  disabled?: boolean;
}

function KanbanBoard({
  columns,
  cards,
  cardPlacements,
  unassignedColumnLabel,
  onCardMove,
  disabled,
}: KanbanBoardProps) {
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("cardId", cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) {
      onCardMove(cardId, columnId);
    }
    setDragOverColumnId(null);
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    // Only reset if leaving to outside the column (not to a child element)
    const relatedTarget = e.relatedTarget as EventTarget | null;
    if (
      !relatedTarget ||
      !(relatedTarget instanceof window.Node) ||
      !e.currentTarget.contains(relatedTarget)
    ) {
      if (dragOverColumnId === columnId) {
        setDragOverColumnId(null);
      }
    }
  };

  // Get cards for each column
  const getCardsForColumn = (columnId: string): KanbanCard[] => {
    const placedCardIds = cardPlacements
      .filter((p) => p.columnId === columnId)
      .map((p) => p.cardId);
    return cards.filter((c) => placedCardIds.includes(c.id));
  };

  // Get unassigned cards
  const getUnassignedCards = (): KanbanCard[] => {
    const allPlacedCardIds = cardPlacements.map((p) => p.cardId);
    return cards.filter((c) => !allPlacedCardIds.includes(c.id));
  };

  const unassignedCards = getUnassignedCards();

  return (
    <div className="overflow-x-auto nowheel">
      <div className="flex gap-2 min-w-max pb-1">
        {/* Unassigned column */}
        <KanbanColumnComponent
          column={{ id: "unassigned", label: unassignedColumnLabel }}
          cards={unassignedCards}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragOver={dragOverColumnId === "unassigned"}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          disabled={disabled}
        />

        {/* User-defined columns */}
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            cards={getCardsForColumn(column.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverColumnId === column.id}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export const KanbanNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<KanbanNode> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;

  // Handlers for edit mode
  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  const handleColumnsChange = (columns: KanbanColumn[]) => {
    updateNodeData(id, { columns });
  };

  const handleCardsChange = (cards: KanbanCard[]) => {
    updateNodeData(id, { cards });
  };

  const handleUnassignedLabelChange = (label: string) => {
    updateNodeData(id, { unassignedColumnLabel: label });
  };

  // Handler for execute mode
  const handleCardMove = (cardId: string, columnId: string) => {
    if (columnId === "unassigned") {
      // Remove from placements
      updateNodeData(id, {
        cardPlacements: data.cardPlacements.filter((p) => p.cardId !== cardId),
      });
    } else {
      // Update or add placement
      const existingIndex = data.cardPlacements.findIndex((p) => p.cardId === cardId);
      const newPlacement: CardPlacement = {
        cardId,
        columnId,
        movedAt: new Date(),
      };

      if (existingIndex >= 0) {
        const updated = [...data.cardPlacements];
        updated[existingIndex] = newPlacement;
        updateNodeData(id, { cardPlacements: updated });
      } else {
        updateNodeData(id, {
          cardPlacements: [...data.cardPlacements, newPlacement],
        });
      }
    }
  };

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.Kanban}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "カンバン"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="カンバン"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>

      <BaseNodeContent>
        {!isExecuteMode && (
          <>
            {/* Settings Section */}
            <div className="collapse collapse-arrow bg-base-200 shrink-0">
              <input type="checkbox" className="nodrag" />
              <div className="collapse-title text-sm font-medium py-2 min-h-0">設定</div>
              <div className="collapse-content space-y-2">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs">未配置列のラベル</span>
                  </label>
                  <input
                    type="text"
                    className="nodrag input input-bordered input-sm"
                    value={data.unassignedColumnLabel}
                    onChange={(e) => handleUnassignedLabelChange(e.target.value)}
                    placeholder="未配置"
                  />
                </div>
              </div>
            </div>

            {/* Columns and Cards - Scrollable area */}
            <div
              className="flex flex-col gap-4 overflow-y-auto nowheel"
              style={{ maxHeight: NODE_CONTENT_HEIGHTS.md }}
            >
              <ItemListEditor
                label="キャラクター（列）"
                items={data.columns}
                onItemsChange={handleColumnsChange}
                addButtonLabel="キャラクターを追加"
              />

              <div className="divider my-0" />

              <ItemListEditor
                label="アイテム（カード）"
                items={data.cards}
                onItemsChange={handleCardsChange}
                addButtonLabel="アイテムを追加"
              />
            </div>
          </>
        )}

        {isExecuteMode && (
          <KanbanBoard
            columns={data.columns}
            cards={data.cards}
            cardPlacements={data.cardPlacements}
            unassignedColumnLabel={data.unassignedColumnLabel}
            onCardMove={handleCardMove}
            disabled={isExecuted}
          />
        )}
      </BaseNodeContent>

      {isExecuteMode && (
        <BaseNodeFooter>
          <div className="text-xs text-base-content/50">
            {data.columns.length}列 / {data.cards.length}カード
          </div>
        </BaseNodeFooter>
      )}
    </BaseNode>
  );
};
