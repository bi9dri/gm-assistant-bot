import { type Node, type NodeProps } from "@xyflow/react";
import { useRef, useState, useEffect } from "react";
import { HiDotsVertical, HiPencil, HiTrash } from "react-icons/hi";
import z from "zod";

import { useTemplateEditorStore } from "@/stores/templateEditorStore";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  cn,
  BaseNodeDataSchema,
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

const InitialPlacementSchema = z.object({
  cardId: z.string(),
  columnId: z.string(),
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("カンバン"),
  columns: z.array(KanbanColumnSchema).default([]),
  cards: z.array(KanbanCardSchema).default([]),
  initialPlacements: z.array(InitialPlacementSchema).default([]),
  cardPlacements: z.array(CardPlacementSchema).default([]),
});

type KanbanNodeData = z.infer<typeof DataSchema>;
type KanbanNode = Node<KanbanNodeData, "Kanban">;

// ============================================================
// Types
// ============================================================

type KanbanCard = z.infer<typeof KanbanCardSchema>;
type KanbanColumn = z.infer<typeof KanbanColumnSchema>;
type CardPlacement = z.infer<typeof CardPlacementSchema>;
type InitialPlacement = z.infer<typeof InitialPlacementSchema>;

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

// ============================================================
// Editable Components (for Edit Mode)
// ============================================================

interface EditableKanbanCardProps {
  card: KanbanCard;
  onLabelChange: (newLabel: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
}

function EditableKanbanCard({
  card,
  onLabelChange,
  onDelete,
  onDragStart,
}: EditableKanbanCardProps) {
  // Prevent drag when starting from input
  const handleDragStart = (e: React.DragEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      return;
    }
    onDragStart(e, card.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="nodrag bg-base-100 rounded px-1 py-0.5 text-sm shadow-sm border border-base-300 flex items-center gap-1 cursor-grab active:cursor-grabbing"
    >
      {/* Drag Handle */}
      <div className="shrink-0 text-base-content/30">
        <HiDotsVertical className="w-3 h-3 rotate-90" />
      </div>

      {/* Input - not draggable */}
      <input
        type="text"
        draggable={false}
        className="input input-xs flex-1 bg-transparent border-none p-0 h-auto min-h-0 focus:outline-none cursor-text"
        value={card.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="カード名"
      />

      {/* Delete Button */}
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square shrink-0 opacity-50 hover:opacity-100"
        onClick={onDelete}
        title="削除"
      >
        ×
      </button>
    </div>
  );
}

interface EditableKanbanColumnProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  onLabelChange: (newLabel: string) => void;
  onDelete: () => void;
  onAddCard: () => void;
  onCardLabelChange: (cardId: string, newLabel: string) => void;
  onCardDelete: (cardId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: (e: React.DragEvent, columnId: string) => void;
}

function EditableKanbanColumn({
  column,
  cards,
  onLabelChange,
  onDelete,
  onAddCard,
  onCardLabelChange,
  onCardDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  onDragEnter,
  onDragLeave,
}: EditableKanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(column.label);
    setIsEditing(true);
    // Close dropdown
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  const handleConfirm = () => {
    onLabelChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      setEditValue(column.label);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    // Close dropdown
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
    onDelete();
  };

  return (
    <div className="flex flex-col min-w-28 max-w-36">
      {/* Column Header */}
      <div className="group flex items-center gap-1 mb-1 min-h-5">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="nodrag input input-xs flex-1 font-medium"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleConfirm}
            placeholder="列名"
          />
        ) : (
          <>
            <span
              className="text-xs font-medium text-base-content/70 truncate flex-1"
              title={column.label}
            >
              {column.label}
            </span>
            <details ref={dropdownRef} className="dropdown dropdown-end nodrag">
              <summary className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 shrink-0">
                <HiDotsVertical className="w-3 h-3" />
              </summary>
              <ul className="dropdown-content menu bg-base-100 rounded-box z-10 w-32 p-1 shadow-lg border border-base-300">
                <li>
                  <button type="button" onClick={handleStartEdit} className="text-xs">
                    <HiPencil className="w-3 h-3" />
                    名前を変更
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleDelete} className="text-xs text-error">
                    <HiTrash className="w-3 h-3" />
                    削除
                  </button>
                </li>
              </ul>
            </details>
          </>
        )}
      </div>

      {/* Column Body */}
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
          <EditableKanbanCard
            key={card.id}
            card={card}
            onLabelChange={(newLabel) => onCardLabelChange(card.id, newLabel)}
            onDelete={() => onCardDelete(card.id)}
            onDragStart={onDragStart}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-xs text-base-content/30 text-center py-2">ドロップ</div>
        )}
      </div>

      {/* Add Card Button */}
      <button
        type="button"
        className="nodrag btn btn-ghost btn-xs mt-1 text-base-content/50"
        onClick={onAddCard}
      >
        + カード
      </button>
    </div>
  );
}

interface EditableKanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  initialPlacements: InitialPlacement[];
  onColumnsChange: (columns: KanbanColumn[]) => void;
  onCardsChange: (cards: KanbanCard[]) => void;
  onInitialPlacementsChange: (placements: InitialPlacement[]) => void;
}

function EditableKanbanBoard({
  columns,
  cards,
  initialPlacements,
  onColumnsChange,
  onCardsChange,
  onInitialPlacementsChange,
}: EditableKanbanBoardProps) {
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Drag handlers
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
      // Update or add placement
      const existingIndex = initialPlacements.findIndex((p) => p.cardId === cardId);
      const newPlacement: InitialPlacement = { cardId, columnId };

      if (existingIndex >= 0) {
        const updated = [...initialPlacements];
        updated[existingIndex] = newPlacement;
        onInitialPlacementsChange(updated);
      } else {
        onInitialPlacementsChange([...initialPlacements, newPlacement]);
      }
    }
    setDragOverColumnId(null);
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
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
    const placedCardIds = initialPlacements
      .filter((p) => p.columnId === columnId)
      .map((p) => p.cardId);
    return cards.filter((c) => placedCardIds.includes(c.id));
  };

  // Column handlers
  const handleAddColumn = () => {
    onColumnsChange([...columns, { id: generateId(), label: "新しい列" }]);
  };

  const handleColumnLabelChange = (columnId: string, newLabel: string) => {
    onColumnsChange(columns.map((c) => (c.id === columnId ? { ...c, label: newLabel } : c)));
  };

  const handleDeleteColumn = (columnId: string) => {
    onColumnsChange(columns.filter((c) => c.id !== columnId));
    // Remove placements for deleted column
    onInitialPlacementsChange(initialPlacements.filter((p) => p.columnId !== columnId));
  };

  // Card handlers
  const handleAddCard = (columnId: string) => {
    const newCard = { id: generateId(), label: "" };
    onCardsChange([...cards, newCard]);
    // Set initial placement for the new card
    onInitialPlacementsChange([...initialPlacements, { cardId: newCard.id, columnId }]);
  };

  const handleCardLabelChange = (cardId: string, newLabel: string) => {
    onCardsChange(cards.map((c) => (c.id === cardId ? { ...c, label: newLabel } : c)));
  };

  const handleCardDelete = (cardId: string) => {
    onCardsChange(cards.filter((c) => c.id !== cardId));
    onInitialPlacementsChange(initialPlacements.filter((p) => p.cardId !== cardId));
  };

  return (
    <div className="overflow-x-auto nowheel">
      <div className="flex gap-2 min-w-max pb-1">
        {/* User-defined columns */}
        {columns.map((column) => (
          <EditableKanbanColumn
            key={column.id}
            column={column}
            cards={getCardsForColumn(column.id)}
            onLabelChange={(newLabel) => handleColumnLabelChange(column.id, newLabel)}
            onDelete={() => handleDeleteColumn(column.id)}
            onAddCard={() => handleAddCard(column.id)}
            onCardLabelChange={handleCardLabelChange}
            onCardDelete={handleCardDelete}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverColumnId === column.id}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          />
        ))}

        {/* Add Column Button */}
        <div className="flex flex-col min-w-20">
          <div className="h-5 mb-1" /> {/* Spacer for header alignment */}
          <button
            type="button"
            className="nodrag btn btn-ghost btn-sm h-20 border border-dashed border-base-300 text-base-content/50"
            onClick={handleAddColumn}
          >
            + 列追加
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Read-only Components (for Execute Mode)
// ============================================================

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
  column: KanbanColumn;
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
  onCardMove: (cardId: string, columnId: string) => void;
  disabled?: boolean;
}

function KanbanBoard({ columns, cards, cardPlacements, onCardMove, disabled }: KanbanBoardProps) {
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

  const getCardsForColumn = (columnId: string): KanbanCard[] => {
    const placedCardIds = cardPlacements
      .filter((p) => p.columnId === columnId)
      .map((p) => p.cardId);
    return cards.filter((c) => placedCardIds.includes(c.id));
  };

  return (
    <div className="overflow-x-auto nowheel">
      <div className="flex gap-2 min-w-max pb-1">
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

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  const handleColumnsChange = (columns: KanbanColumn[]) => {
    updateNodeData(id, { columns });
  };

  const handleCardsChange = (cards: KanbanCard[]) => {
    updateNodeData(id, { cards });
  };

  const handleInitialPlacementsChange = (initialPlacements: InitialPlacement[]) => {
    updateNodeData(id, { initialPlacements });
  };

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (
      isExecuteMode &&
      !hasInitialized.current &&
      data.cardPlacements.length === 0 &&
      data.initialPlacements.length > 0
    ) {
      hasInitialized.current = true;
      const now = new Date();
      updateNodeData(id, {
        cardPlacements: data.initialPlacements.map((p) => ({
          ...p,
          movedAt: now,
        })),
      });
    }
  }, [isExecuteMode, data.cardPlacements.length, data.initialPlacements, id, updateNodeData]);

  const handleCardMove = (cardId: string, columnId: string) => {
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
          <EditableKanbanBoard
            columns={data.columns}
            cards={data.cards}
            initialPlacements={data.initialPlacements}
            onColumnsChange={handleColumnsChange}
            onCardsChange={handleCardsChange}
            onInitialPlacementsChange={handleInitialPlacementsChange}
          />
        )}

        {isExecuteMode && (
          <KanbanBoard
            columns={data.columns}
            cards={data.cards}
            cardPlacements={data.cardPlacements}
            onCardMove={handleCardMove}
            disabled={isExecuted}
          />
        )}
      </BaseNodeContent>
    </BaseNode>
  );
};
