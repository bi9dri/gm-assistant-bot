import { useEffect, useRef, useState } from "react";
import { HiDotsVertical, HiPencil, HiTrash } from "react-icons/hi";

import { KanbanStepSchema, type KanbanStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

type KanbanItem = KanbanStep["columns"][number];
type InitialPlacement = KanbanStep["initialPlacements"][number];

interface EditableKanbanCardProps {
  card: KanbanItem;
  onLabelChange: (newLabel: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
}

const EditableKanbanCard = ({
  card,
  onLabelChange,
  onDelete,
  onDragStart,
}: EditableKanbanCardProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    // input からのドラッグはテキスト選択を優先する
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
      className="bg-base-100 rounded px-1 py-0.5 text-sm shadow-sm border border-base-300 flex items-center gap-1 cursor-grab active:cursor-grabbing"
    >
      <div className="shrink-0 text-base-content/30">
        <HiDotsVertical className="w-3 h-3 rotate-90" />
      </div>
      <input
        type="text"
        draggable={false}
        className="input input-xs flex-1 bg-transparent border-none p-0 h-auto min-h-0 focus:outline-none cursor-text"
        value={card.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="カード名"
      />
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
};

interface EditableKanbanColumnProps {
  column: KanbanItem;
  cards: KanbanItem[];
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

const EditableKanbanColumn = ({
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
}: EditableKanbanColumnProps) => {
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
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
    onDelete();
  };

  return (
    <div className="flex flex-col min-w-28 max-w-36">
      <div className="group flex items-center gap-1 mb-1 min-h-5">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="input input-xs flex-1 font-medium"
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
            <details ref={dropdownRef} className="dropdown dropdown-end">
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

      <div
        className={`flex-1 min-h-20 p-1 rounded border border-dashed space-y-1 overflow-y-auto ${
          isDragOver ? "border-primary bg-primary/10" : "border-base-300 bg-base-200/50"
        }`}
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

      <button
        type="button"
        className="btn btn-ghost btn-xs mt-1 text-base-content/50"
        onClick={onAddCard}
      >
        + カード
      </button>
    </div>
  );
};

const KanbanDetailPanel = ({ step, onChange }: DetailPanelProps<KanbanStep>) => {
  const { columns, cards, initialPlacements } = step;
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
      const existingIndex = initialPlacements.findIndex((p) => p.cardId === cardId);
      const newPlacement: InitialPlacement = { cardId, columnId };
      if (existingIndex >= 0) {
        const updated = [...initialPlacements];
        updated[existingIndex] = newPlacement;
        onChange({ initialPlacements: updated });
      } else {
        onChange({ initialPlacements: [...initialPlacements, newPlacement] });
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

  const getCardsForColumn = (columnId: string): KanbanItem[] => {
    const placedCardIds = initialPlacements
      .filter((p) => p.columnId === columnId)
      .map((p) => p.cardId);
    return cards.filter((c) => placedCardIds.includes(c.id));
  };

  const handleAddColumn = () => {
    onChange({ columns: [...columns, { id: crypto.randomUUID(), label: "新しい列" }] });
  };

  const handleColumnLabelChange = (columnId: string, newLabel: string) => {
    onChange({ columns: columns.map((c) => (c.id === columnId ? { ...c, label: newLabel } : c)) });
  };

  const handleDeleteColumn = (columnId: string) => {
    onChange({
      columns: columns.filter((c) => c.id !== columnId),
      initialPlacements: initialPlacements.filter((p) => p.columnId !== columnId),
    });
  };

  const handleAddCard = (columnId: string) => {
    const newCard: KanbanItem = { id: crypto.randomUUID(), label: "" };
    onChange({
      cards: [...cards, newCard],
      initialPlacements: [...initialPlacements, { cardId: newCard.id, columnId }],
    });
  };

  const handleCardLabelChange = (cardId: string, newLabel: string) => {
    onChange({ cards: cards.map((c) => (c.id === cardId ? { ...c, label: newLabel } : c)) });
  };

  const handleCardDelete = (cardId: string) => {
    onChange({
      cards: cards.filter((c) => c.id !== cardId),
      initialPlacements: initialPlacements.filter((p) => p.cardId !== cardId),
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-1">
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

        <div className="flex flex-col min-w-20">
          <div className="h-5 mb-1" />
          <button
            type="button"
            className="btn btn-ghost btn-sm h-20 border border-dashed border-base-300 text-base-content/50"
            onClick={handleAddColumn}
          >
            + 列追加
          </button>
        </div>
      </div>
    </div>
  );
};

export const KanbanEntry = defineStep<KanbanStep>({
  type: "Kanban",
  schema: KanbanStepSchema,
  category: "tool",
  defaults: () => ({
    type: "Kanban",
    title: "カンバン",
    memo: "",
    autoAdvance: false,
    columns: [],
    cards: [],
    initialPlacements: [],
    cardPlacements: [],
  }),
  summary: (step) =>
    step.columns.length > 0 || step.cards.length > 0
      ? `カンバン: ${step.cards.length}枚 / ${step.columns.length}列`
      : "カンバン (未設定)",
  DetailPanel: KanbanDetailPanel,
});
