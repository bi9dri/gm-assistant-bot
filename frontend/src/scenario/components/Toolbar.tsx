import type { Editor } from "@tiptap/react";
import clsx from "clsx";

import { StepTypeMenu } from "@/flow/components/AddStepMenu";
import type { Step } from "@/flow/schema";

import { BRANCH_NODE_NAME, STEP_NODE_NAME } from "../schema";
import { INSERTABLE_CATEGORIES } from "./EditorChips";

// 本文の書式と文中への操作挿入 (docs: scenario-editor-architecture D20 / D24)。
// Markdown 風の打鍵は ProseMirror の入力ルールが担うため、ここは補助の並び。

const ToolbarButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={clsx("btn btn-ghost btn-xs", active && "btn-active")}
    // ボタンを押した瞬間に本文のキャレットが飛ぶと、書式が別の場所に当たる。
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >
    {label}
  </button>
);

export const Toolbar = ({
  editor,
  onInsertStep,
}: {
  editor: Editor | null;
  // 実体を作って id を返す。ノードの挿入だけをここで行う (doc の変更経路は 1 本)。
  onInsertStep: (type: Step["type"]) => Step | undefined;
}) => {
  if (editor === null) return null;

  const insert = (type: Step["type"]) => {
    const step = onInsertStep(type);
    if (step === undefined) return;
    editor
      .chain()
      .focus()
      .insertContent(
        step.type === "Branch"
          ? { type: BRANCH_NODE_NAME, attrs: { stepId: step.id } }
          : { type: STEP_NODE_NAME, attrs: { stepId: step.id } },
      )
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-base-300 px-3 py-1">
      {([1, 2, 3] as const).map((level) => (
        <ToolbarButton
          key={level}
          label={`H${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        />
      ))}
      <ToolbarButton
        label="太字"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="ハイライト"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      />
      <ToolbarButton
        label="箇条書き"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="番号付き"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="引用"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <div className="w-44">
        <StepTypeMenu
          label="＋ 操作を挿入"
          categories={[...INSERTABLE_CATEGORIES]}
          onPick={insert}
        />
      </div>
    </div>
  );
};
