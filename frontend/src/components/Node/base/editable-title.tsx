import { useEffect, useRef, useState } from "react";
import { HiPencil } from "react-icons/hi";

interface EditableTitleProps {
  title: string;
  defaultTitle: string;
  onTitleChange: (newTitle: string) => void;
}

export function EditableTitle({ title, defaultTitle, onTitleChange }: EditableTitleProps) {
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
