import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { LuUpload, LuDownload, LuChevronDown, LuChevronRight } from "react-icons/lu";
import z from "zod";

import { ApiClient } from "@/api";
import { db } from "@/db";
import { FileSystem } from "@/fileSystem";
import { useTemplateEditorStore } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

import {
  BaseHandle,
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  EditableTitle,
  cn,
} from "../base";
import { BaseNodeDataSchema, NODE_CONTENT_HEIGHTS, NODE_TYPE_WIDTHS } from "../base";
import { useNodeExecutionOptional, useTemplateEditorContextOptional } from "../contexts";
import {
  ResourceSelector,
  type Attachment,
  FILE_SIZE_WARNING_THRESHOLD,
  MessageBlockSchema,
  formatFileSize,
  saveFileToOPFS,
} from "../utils";

const CombinationEntrySchema = z.object({
  id: z.string(),
  channelName: z.string().trim().default(""),
  messages: z
    .array(MessageBlockSchema)
    .min(1)
    .default([{ content: "", attachments: [] }]),
  collapsed: z.boolean().default(false),
});

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("組み合わせメッセージを送信する"),
  entries: z
    .array(CombinationEntrySchema)
    .min(1)
    .default([
      {
        id: crypto.randomUUID(),
        channelName: "",
        messages: [{ content: "", attachments: [] }],
        collapsed: false,
      },
    ]),
});

type CombinationSendMessageNodeData = Node<z.infer<typeof DataSchema>, "CombinationSendMessage">;

type Entry = z.infer<typeof CombinationEntrySchema>;

export const CombinationSendMessageNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<CombinationSendMessageNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const missingFilePaths = useTemplateEditorStore((state) => state.missingFilePaths);
  const removeMissingFilePath = useTemplateEditorStore((state) => state.removeMissingFilePath);
  const templateEditorContext = useTemplateEditorContextOptional();
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const dragCounterRefs = useRef<Map<string, number>>(new Map());

  const [isLoading, setIsLoading] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (executionContext) {
      void db.Channel.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setChannels);
    }
  }, [executionContext]);

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;
  const hasMissingFiles = data.entries.some((entry) =>
    entry.messages.some((m) => m.attachments.some((a) => missingFilePaths.has(a.filePath))),
  );

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };

  // --- Entry-level helpers ---

  const updateEntry = (entryIndex: number, patch: Partial<Entry>) => {
    const newEntries = data.entries.map((entry, i) =>
      i === entryIndex ? { ...entry, ...patch } : entry,
    );
    updateNodeData(id, { entries: newEntries });
  };

  const handleAddEntry = () => {
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      channelName: "",
      messages: [{ content: "", attachments: [] }],
      collapsed: false,
    };
    updateNodeData(id, { entries: [...data.entries, newEntry] });
  };

  const handleRemoveEntry = (entryIndex: number) => {
    if (data.entries.length <= 1) {
      addToast({ message: "最低1つのエントリが必要です", status: "warning" });
      return;
    }
    const entry = data.entries[entryIndex];
    const fs = new FileSystem();
    for (const message of entry.messages) {
      for (const attachment of message.attachments) {
        void fs.deleteFile(attachment.filePath).catch(() => {});
      }
    }
    updateNodeData(id, { entries: data.entries.filter((_, i) => i !== entryIndex) });
  };

  const handleToggleCollapse = (entryIndex: number) => {
    updateEntry(entryIndex, { collapsed: !data.entries[entryIndex].collapsed });
  };

  // --- Message-level helpers ---

  const handleContentChange = (entryIndex: number, messageIndex: number, value: string) => {
    const newMessages = [...data.entries[entryIndex].messages];
    newMessages[messageIndex] = { ...newMessages[messageIndex], content: value };
    updateEntry(entryIndex, { messages: newMessages });
  };

  const handleAddMessageBlock = (entryIndex: number) => {
    const newMessages = [...data.entries[entryIndex].messages, { content: "", attachments: [] }];
    updateEntry(entryIndex, { messages: newMessages });
  };

  const handleRemoveMessageBlock = (entryIndex: number, messageIndex: number) => {
    const entry = data.entries[entryIndex];
    if (entry.messages.length <= 1) {
      addToast({ message: "最低1つのメッセージが必要です", status: "warning" });
      return;
    }
    const message = entry.messages[messageIndex];
    const fs = new FileSystem();
    for (const attachment of message.attachments) {
      void fs.deleteFile(attachment.filePath).catch(() => {});
    }
    updateEntry(entryIndex, {
      messages: entry.messages.filter((_, i) => i !== messageIndex),
    });
  };

  // --- File helpers ---

  const processFiles = useCallback(
    async (entryIndex: number, messageIndex: number, files: File[]) => {
      const templateId = templateEditorContext?.templateId;
      const sessionId = executionContext?.sessionId;

      if (!templateId && !sessionId) {
        addToast({ message: "テンプレートIDまたはセッションIDが取得できません", status: "error" });
        return;
      }

      const currentAttachments = data.entries[entryIndex].messages[messageIndex].attachments;
      const remainingSlots = 4 - currentAttachments.length;
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
          removeMissingFilePath(filePath);
          newAttachments.push({ fileName: file.name, filePath, fileSize: file.size });
        } catch (error) {
          console.error("Failed to write file:", error);
          addToast({ message: `ファイル「${file.name}」の保存に失敗しました`, status: "error" });
        }
      }

      if (newAttachments.length > 0) {
        const newMessages = [...data.entries[entryIndex].messages];
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          attachments: [...currentAttachments, ...newAttachments],
        };
        updateEntry(entryIndex, { messages: newMessages });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      templateEditorContext,
      executionContext,
      data.entries,
      id,
      updateNodeData,
      addToast,
      removeMissingFilePath,
    ],
  );

  const fileRefKey = (entryIndex: number, messageIndex: number) => `${entryIndex}-${messageIndex}`;

  const handleFileAdd = async (
    entryIndex: number,
    messageIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(entryIndex, messageIndex, Array.from(files));
    const key = fileRefKey(entryIndex, messageIndex);
    const inputRef = fileInputRefs.current.get(key);
    if (inputRef) inputRef.value = "";
  };

  const handleFileRemove = async (entryIndex: number, messageIndex: number, fileIndex: number) => {
    const attachment = data.entries[entryIndex].messages[messageIndex].attachments[fileIndex];
    const fs = new FileSystem();
    try {
      await fs.deleteFile(attachment.filePath);
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
    const newMessages = [...data.entries[entryIndex].messages];
    newMessages[messageIndex] = {
      ...newMessages[messageIndex],
      attachments: newMessages[messageIndex].attachments.filter((_, i) => i !== fileIndex),
    };
    updateEntry(entryIndex, { messages: newMessages });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (key: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const counter = (dragCounterRefs.current.get(key) ?? 0) + 1;
    dragCounterRefs.current.set(key, counter);
    if (e.dataTransfer.types.includes("Files")) {
      setDraggingKey(key);
    }
  };

  const handleDragLeave = (key: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const counter = (dragCounterRefs.current.get(key) ?? 1) - 1;
    dragCounterRefs.current.set(key, counter);
    if (counter === 0) setDraggingKey(null);
  };

  const handleDrop = async (
    entryIndex: number,
    messageIndex: number,
    key: string,
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRefs.current.set(key, 0);
    setDraggingKey(null);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processFiles(entryIndex, messageIndex, Array.from(files));
  };

  // --- Execution ---

  const handleSend = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { bot } = executionContext;

    const resolvedEntries: { channelId: string; messages: Entry["messages"] }[] = [];
    const notFoundChannels: string[] = [];

    for (const entry of data.entries) {
      const channelName = entry.channelName.trim();
      if (!channelName) continue;

      const channel = channels.find((c) => c.name.toLowerCase() === channelName.toLowerCase());
      if (channel) {
        resolvedEntries.push({ channelId: channel.id, messages: entry.messages });
      } else {
        notFoundChannels.push(channelName);
      }
    }

    if (notFoundChannels.length > 0) {
      addToast({
        message: `チャンネルが見つかりません: ${notFoundChannels.join(", ")}`,
        status: "error",
      });
      return;
    }

    if (resolvedEntries.length === 0) {
      addToast({ message: "対象チャンネルが見つかりません", status: "error" });
      return;
    }

    const hasAnyValidMessage = resolvedEntries.some((entry) =>
      entry.messages.some((m) => m.content.trim() !== "" || m.attachments.length > 0),
    );
    if (!hasAnyValidMessage) {
      addToast({ message: "メッセージまたはファイルを指定してください", status: "warning" });
      return;
    }

    setIsLoading(true);

    const client = new ApiClient(bot.token);
    const fs = new FileSystem();

    try {
      for (const { channelId, messages } of resolvedEntries) {
        for (const message of messages) {
          if (message.content.trim() === "" && message.attachments.length === 0) continue;

          const files: File[] = [];
          for (const attachment of message.attachments) {
            try {
              const file = await fs.readFile(attachment.filePath);
              files.push(file);
            } catch (error) {
              console.error("Failed to read file:", error);
              addToast({
                message: `ファイル「${attachment.fileName}」の読み込みに失敗しました`,
                status: "error",
              });
              setIsLoading(false);
              return;
            }
          }

          await client.sendMessage({
            channelId,
            content: message.content,
            files: files.length > 0 ? files : undefined,
          });
        }
      }

      addToast({
        message: `${resolvedEntries.length}個のチャンネルにメッセージを送信しました`,
        status: "success",
        durationSeconds: 5,
      });
      updateNodeData(id, { executedAt: new Date() });
    } catch (error) {
      console.error("Failed to send message:", error);
      addToast({ message: "メッセージの送信に失敗しました", status: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.CombinationSendMessage}
      className={cn(
        "bg-base-300",
        data.executedAt && "border-success bg-success/10",
        hasMissingFiles && "border-error bg-error/10",
      )}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>
            {data.title || "組み合わせメッセージを送信する"}
          </BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="組み合わせメッセージを送信する"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.lg}>
        <div className="space-y-2">
          {data.entries.map((entry, entryIndex) => (
            <div
              key={entry.id}
              className="border border-base-content/20 rounded-lg overflow-hidden"
            >
              {/* Entry header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-base-200/50">
                <button
                  type="button"
                  className="nodrag btn btn-ghost btn-xs p-0"
                  onClick={() => handleToggleCollapse(entryIndex)}
                >
                  {entry.collapsed ? (
                    <LuChevronRight className="w-4 h-4" />
                  ) : (
                    <LuChevronDown className="w-4 h-4" />
                  )}
                </button>
                <span className="text-xs font-semibold flex-1">
                  エントリ {entryIndex + 1}
                  {entry.channelName && (
                    <span className="text-base-content/60 font-normal ml-1">
                      — {entry.channelName}
                    </span>
                  )}
                </span>
                {!isExecuteMode && data.entries.length > 1 && (
                  <button
                    type="button"
                    className="nodrag btn btn-ghost btn-xs"
                    onClick={() => handleRemoveEntry(entryIndex)}
                    disabled={isLoading || isExecuted}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Entry body */}
              {!entry.collapsed && (
                <div className="p-3 space-y-3">
                  {/* Channel selector */}
                  <div>
                    <label className="text-xs font-semibold mb-1 block">送信先チャンネル</label>
                    <ResourceSelector
                      nodeId={id}
                      resourceType="channel"
                      value={entry.channelName}
                      onChange={(newName) => updateEntry(entryIndex, { channelName: newName })}
                      placeholder="チャンネル名"
                      disabled={isExecuteMode || isLoading || isExecuted}
                      channelTypeFilter="text"
                    />
                  </div>

                  {/* Message blocks */}
                  {entry.messages.map((message, messageIndex) => {
                    const dragKey = fileRefKey(entryIndex, messageIndex);
                    return (
                      <div
                        key={`${entry.id}-message-${messageIndex}`}
                        className="border border-base-content/10 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          {!(isExecuteMode && message.content === "") && (
                            <span className="text-xs text-base-content/60">
                              {message.content.length}/2000
                            </span>
                          )}
                          {!isExecuteMode && entry.messages.length > 1 && (
                            <button
                              type="button"
                              className="nodrag btn btn-ghost btn-xs"
                              onClick={() => handleRemoveMessageBlock(entryIndex, messageIndex)}
                              disabled={isLoading || isExecuted}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {!(isExecuteMode && message.content === "") && (
                          <textarea
                            className="nodrag textarea textarea-bordered w-full h-24"
                            value={message.content}
                            onChange={(e) =>
                              handleContentChange(entryIndex, messageIndex, e.target.value)
                            }
                            placeholder="メッセージを入力"
                            maxLength={2000}
                            disabled={isExecuteMode || isLoading || isExecuted}
                          />
                        )}

                        <div>
                          <label className="text-xs font-semibold mb-1 block">
                            添付ファイル ({message.attachments.length}/4)
                          </label>

                          {message.attachments.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {message.attachments.map((attachment, fileIndex) => (
                                <div
                                  key={`${entry.id}-message-${messageIndex}-attachment-${fileIndex}`}
                                  className={cn(
                                    "flex items-center gap-2 rounded px-2 py-1",
                                    missingFilePaths.has(attachment.filePath)
                                      ? "bg-error/20 border border-error/30"
                                      : "bg-base-200",
                                  )}
                                >
                                  <span className="text-sm truncate flex-1">
                                    {attachment.fileName}
                                  </span>
                                  {missingFilePaths.has(attachment.filePath) && (
                                    <span className="badge badge-error badge-xs text-xs">欠落</span>
                                  )}
                                  <span className="text-xs text-base-content/60">
                                    {formatFileSize(attachment.fileSize)}
                                  </span>
                                  {attachment.fileSize > FILE_SIZE_WARNING_THRESHOLD && (
                                    <span
                                      className="text-warning text-xs"
                                      title="このファイルは1MBを超えています。圧縮などでサイズを最適化することをお勧めします"
                                    >
                                      !
                                    </span>
                                  )}
                                  {!isExecuteMode && (
                                    <button
                                      type="button"
                                      className="nodrag btn btn-ghost btn-xs"
                                      onClick={() =>
                                        handleFileRemove(entryIndex, messageIndex, fileIndex)
                                      }
                                      disabled={isLoading || isExecuted}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {message.attachments.some(
                            (a) => a.fileSize > FILE_SIZE_WARNING_THRESHOLD,
                          ) && (
                            <p className="text-xs text-warning mb-2">
                              1MBを超えるファイルがあります。圧縮などでサイズを最適化することをお勧めします。
                            </p>
                          )}

                          {!isExecuteMode && (
                            <>
                              {message.attachments.length < 4 ? (
                                <>
                                  <input
                                    ref={(el) => {
                                      if (el) fileInputRefs.current.set(dragKey, el);
                                    }}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleFileAdd(entryIndex, messageIndex, e)}
                                    disabled={isLoading || isExecuted}
                                  />
                                  <div
                                    className={cn(
                                      "nodrag",
                                      "flex flex-col items-center justify-center gap-1",
                                      "rounded-lg border-2 p-4 cursor-pointer",
                                      "transition-all duration-200",
                                      draggingKey === dragKey
                                        ? "border-primary bg-primary/10 border-solid"
                                        : "border-dashed border-base-content/30 hover:border-base-content/50 hover:bg-base-200/50",
                                      (isLoading || isExecuted) &&
                                        "opacity-50 pointer-events-none cursor-not-allowed",
                                    )}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(dragKey, e)}
                                    onDragLeave={(e) => handleDragLeave(dragKey, e)}
                                    onDrop={(e) => handleDrop(entryIndex, messageIndex, dragKey, e)}
                                    onClick={() =>
                                      !isLoading &&
                                      !isExecuted &&
                                      fileInputRefs.current.get(dragKey)?.click()
                                    }
                                  >
                                    {draggingKey === dragKey ? (
                                      <>
                                        <LuDownload className="w-6 h-6 text-primary" />
                                        <span className="text-sm text-primary font-medium">
                                          ファイルをドロップ
                                        </span>
                                        <span className="text-xs text-primary/70">
                                          あと{4 - message.attachments.length}個追加できます
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <LuUpload className="w-5 h-5 text-base-content/60" />
                                        <span className="text-sm text-base-content/60">
                                          ファイルをドロップまたはクリックして追加
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p className="text-xs text-base-content/60 text-center py-2">
                                  添付ファイルは最大4つまでです
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!isExecuteMode && (
                    <button
                      type="button"
                      className="nodrag btn btn-ghost btn-xs w-full"
                      onClick={() => handleAddMessageBlock(entryIndex)}
                      disabled={isLoading || isExecuted}
                    >
                      + メッセージを追加
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {!isExecuteMode && (
            <button
              type="button"
              className="nodrag btn btn-outline btn-sm w-full"
              onClick={handleAddEntry}
              disabled={isLoading || isExecuted}
            >
              + エントリを追加
            </button>
          )}
        </div>
      </BaseNodeContent>

      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary"
          onClick={handleSend}
          disabled={!isExecuteMode || isLoading || !!data.executedAt}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          送信
        </button>
      </BaseNodeFooter>

      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Right} />
    </BaseNode>
  );
};
