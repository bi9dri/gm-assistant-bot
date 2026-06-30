import type { z } from "zod";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { LuDownload, LuUpload } from "react-icons/lu";

import {
  type Attachment,
  FILE_SIZE_WARNING_THRESHOLD,
  MessageBlockSchema,
  formatFileSize,
  saveFileToOPFS,
} from "@/components/Node/utils";
import { FileSystem } from "@/fileSystem";
import { useToast } from "@/toast/ToastProvider";

import { useAttachmentTarget } from "./messageContext";

type MessageBlock = z.infer<typeof MessageBlockSchema>;

const MAX_ATTACHMENTS = 4;

interface MessageBlocksEditorProps {
  messages: MessageBlock[];
  onChange: (messages: MessageBlock[]) => void;
  nodeId: string;
}

// SendMessage / CombinationSendMessage 共通のメッセージブロック編集 UI。
// 添付の保存先 (templateId/sessionId) は useAttachmentTarget() から取得し、
// 取得できない場合は添付を無効化してテキストのみ編集できるようにする。
export const MessageBlocksEditor = ({ messages, onChange, nodeId }: MessageBlocksEditorProps) => {
  const { templateId, sessionId } = useAttachmentTarget();
  const { addToast } = useToast();

  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const dragCounterRefs = useRef<Map<number, number>>(new Map());
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const canAttach = templateId !== undefined || sessionId !== undefined;

  const handleContentChange = (messageIndex: number, value: string) => {
    onChange(
      messages.map((message, i) => (i === messageIndex ? { ...message, content: value } : message)),
    );
  };

  const handleAddMessageBlock = () => {
    onChange([...messages, { content: "", attachments: [] }]);
  };

  const handleRemoveMessageBlock = (messageIndex: number) => {
    const fs = new FileSystem();
    for (const attachment of messages[messageIndex].attachments) {
      // ベストエフォート削除。失敗しても処理は続けるが、孤児ファイルの調査用にログは残す。
      void fs.deleteFile(attachment.filePath).catch((error: unknown) => {
        console.error("Failed to delete attachment file:", error);
      });
    }
    onChange(messages.filter((_, i) => i !== messageIndex));
  };

  const processFiles = async (messageIndex: number, files: File[]) => {
    if (!canAttach) {
      addToast({ message: "テンプレートIDまたはセッションIDが取得できません", status: "error" });
      return;
    }

    const currentAttachments = messages[messageIndex].attachments;
    const remainingSlots = MAX_ATTACHMENTS - currentAttachments.length;
    if (remainingSlots <= 0) {
      addToast({ message: "添付ファイルは最大4つまでです", status: "warning" });
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      addToast({
        message: `${files.length - remainingSlots}個のファイルは追加できませんでした（上限: 4個）`,
        status: "warning",
      });
    }

    const newAttachments: Attachment[] = [];
    for (const file of filesToAdd) {
      try {
        const filePath = await saveFileToOPFS(file, { templateId, sessionId });
        newAttachments.push({ fileName: file.name, filePath, fileSize: file.size });
      } catch (error) {
        console.error("Failed to write file:", error);
        addToast({ message: `ファイル「${file.name}」の保存に失敗しました`, status: "error" });
      }
    }

    if (newAttachments.length > 0) {
      onChange(
        messages.map((message, i) =>
          i === messageIndex
            ? { ...message, attachments: [...message.attachments, ...newAttachments] }
            : message,
        ),
      );
    }
  };

  const handleFileAdd = async (messageIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(messageIndex, Array.from(files));
    const inputRef = fileInputRefs.current.get(messageIndex);
    if (inputRef) inputRef.value = "";
  };

  const handleFileRemove = async (messageIndex: number, fileIndex: number) => {
    const attachment = messages[messageIndex].attachments[fileIndex];
    const fs = new FileSystem();
    try {
      await fs.deleteFile(attachment.filePath);
    } catch (error) {
      console.error("Failed to delete file:", error);
      addToast({
        message: "ファイルの削除に失敗しましたが、一覧からは除外しました",
        status: "warning",
      });
    }
    onChange(
      messages.map((message, i) =>
        i === messageIndex
          ? { ...message, attachments: message.attachments.filter((_, fi) => fi !== fileIndex) }
          : message,
      ),
    );
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (messageIndex: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const counter = (dragCounterRefs.current.get(messageIndex) ?? 0) + 1;
    dragCounterRefs.current.set(messageIndex, counter);
    if (e.dataTransfer.types.includes("Files")) setDraggingIndex(messageIndex);
  };

  const handleDragLeave = (messageIndex: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const counter = (dragCounterRefs.current.get(messageIndex) ?? 1) - 1;
    dragCounterRefs.current.set(messageIndex, counter);
    if (counter === 0) setDraggingIndex(null);
  };

  const handleDrop = async (messageIndex: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRefs.current.set(messageIndex, 0);
    setDraggingIndex(null);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processFiles(messageIndex, Array.from(files));
  };

  return (
    <div className="space-y-2">
      {messages.map((message, messageIndex) => (
        <div
          // eslint-disable-next-line react/no-array-index-key -- 行 id を持たないメッセージ配列
          key={`${nodeId}-message-${messageIndex}`}
          className="space-y-2 rounded-lg border border-base-content/20 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-base-content/60">{message.content.length}/2000</span>
            {messages.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleRemoveMessageBlock(messageIndex)}
              >
                ×
              </button>
            )}
          </div>

          <textarea
            className="textarea textarea-bordered h-24 w-full"
            value={message.content}
            onChange={(e) => handleContentChange(messageIndex, e.target.value)}
            placeholder="メッセージを入力"
            maxLength={2000}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold">
              添付ファイル ({message.attachments.length}/4)
            </label>

            {message.attachments.length > 0 && (
              <div className="mb-2 space-y-1">
                {message.attachments.map((attachment, fileIndex) => (
                  <div
                    key={`${nodeId}-message-${messageIndex}-attachment-${attachment.filePath}`}
                    className="flex items-center gap-2 rounded bg-base-200 px-2 py-1"
                  >
                    <span className="flex-1 truncate text-sm">{attachment.fileName}</span>
                    <span className="text-xs text-base-content/60">
                      {formatFileSize(attachment.fileSize)}
                    </span>
                    {attachment.fileSize > FILE_SIZE_WARNING_THRESHOLD && (
                      <span
                        className="text-xs text-warning"
                        title="このファイルは1MBを超えています。圧縮などでサイズを最適化することをお勧めします"
                      >
                        !
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        void handleFileRemove(messageIndex, fileIndex);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {message.attachments.some((a) => a.fileSize > FILE_SIZE_WARNING_THRESHOLD) && (
              <p className="mb-2 text-xs text-warning">
                1MBを超えるファイルがあります。圧縮などでサイズを最適化することをお勧めします。
              </p>
            )}

            {canAttach ? (
              message.attachments.length < MAX_ATTACHMENTS ? (
                <>
                  <input
                    ref={(el) => {
                      if (el) fileInputRefs.current.set(messageIndex, el);
                    }}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleFileAdd(messageIndex, e);
                    }}
                  />
                  <div
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 transition-all duration-200 ${
                      draggingIndex === messageIndex
                        ? "border-solid border-primary bg-primary/10"
                        : "border-dashed border-base-content/30 hover:border-base-content/50 hover:bg-base-200/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(messageIndex, e)}
                    onDragLeave={(e) => handleDragLeave(messageIndex, e)}
                    onDrop={(e) => {
                      void handleDrop(messageIndex, e);
                    }}
                    onClick={() => fileInputRefs.current.get(messageIndex)?.click()}
                  >
                    {draggingIndex === messageIndex ? (
                      <>
                        <LuDownload className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-primary">ファイルをドロップ</span>
                        <span className="text-xs text-primary/70">
                          あと{MAX_ATTACHMENTS - message.attachments.length}個追加できます
                        </span>
                      </>
                    ) : (
                      <>
                        <LuUpload className="h-5 w-5 text-base-content/60" />
                        <span className="text-sm text-base-content/60">
                          ファイルをドロップまたはクリックして追加
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="py-2 text-center text-xs text-base-content/60">
                  添付ファイルは最大4つまでです
                </p>
              )
            ) : (
              <p className="text-xs text-base-content/60">
                添付ファイルを追加するにはテンプレートまたはセッションが必要です
              </p>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline btn-sm w-full"
        onClick={handleAddMessageBlock}
      >
        + メッセージを追加
      </button>
    </div>
  );
};
