import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { LuUpload, LuDownload } from "react-icons/lu";
import z from "zod";

import { ApiClient } from "@/api";
import { db, type ChannelData, GameSession } from "@/db";
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

const ChannelTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("channelName"), value: z.string().trim() }),
  z.object({ type: z.literal("flagKey"), value: z.string().trim() }),
]);

type ChannelTarget = z.infer<typeof ChannelTargetSchema>;

export const DataSchema = BaseNodeDataSchema.extend({
  title: z.string().default("メッセージを送信する"),
  channelTargets: z
    .array(ChannelTargetSchema)
    .min(1)
    .default([{ type: "channelName", value: "" }]),
  messages: z
    .array(MessageBlockSchema)
    .min(1)
    .default([{ content: "", attachments: [] }]),
});

type SendMessageNodeData = Node<z.infer<typeof DataSchema>, "SendMessage">;

export const SendMessageNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<SendMessageNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const missingFilePaths = useTemplateEditorStore((state) => state.missingFilePaths);
  const removeMissingFilePath = useTemplateEditorStore((state) => state.removeMissingFilePath);
  const templateEditorContext = useTemplateEditorContextOptional();
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const dragCounterRefs = useRef<Map<number, number>>(new Map());

  const [channels, setChannels] = useState<ChannelData[]>([]);

  const handleTitleChange = (newTitle: string) => {
    updateNodeData(id, { title: newTitle });
  };
  const [isLoading, setIsLoading] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (executionContext) {
      void db.Channel.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setChannels);
    }
  }, [executionContext]);

  const handleChannelTargetChange = (index: number, value: string) => {
    const newTargets = [...data.channelTargets];
    newTargets[index] = { ...newTargets[index], value };
    updateNodeData(id, { channelTargets: newTargets });
  };

  const handleChannelTargetTypeChange = (index: number, type: ChannelTarget["type"]) => {
    const newTargets = [...data.channelTargets];
    newTargets[index] = { type, value: "" };
    updateNodeData(id, { channelTargets: newTargets });
  };

  const handleAddChannelTarget = () => {
    const newTargets = [...data.channelTargets, { type: "channelName" as const, value: "" }];
    updateNodeData(id, { channelTargets: newTargets });
  };

  const handleRemoveChannelTarget = (index: number) => {
    if (data.channelTargets.length <= 1) {
      addToast({ message: "最低1つのチャンネルが必要です", status: "warning" });
      return;
    }
    const newTargets = data.channelTargets.filter((_, i) => i !== index);
    updateNodeData(id, { channelTargets: newTargets });
  };

  const handleContentChange = (messageIndex: number, value: string) => {
    const newMessages = [...data.messages];
    newMessages[messageIndex] = { ...newMessages[messageIndex], content: value };
    updateNodeData(id, { messages: newMessages });
  };

  const handleAddMessageBlock = () => {
    const newMessages = [...data.messages, { content: "", attachments: [] }];
    updateNodeData(id, { messages: newMessages });
  };

  const handleRemoveMessageBlock = (messageIndex: number) => {
    if (data.messages.length <= 1) {
      addToast({ message: "最低1つのメッセージが必要です", status: "warning" });
      return;
    }

    const message = data.messages[messageIndex];
    const fs = new FileSystem();
    for (const attachment of message.attachments) {
      void fs.deleteFile(attachment.filePath).catch(() => {});
    }

    const newMessages = data.messages.filter((_, i) => i !== messageIndex);
    updateNodeData(id, { messages: newMessages });
  };

  // Common file processing logic for a specific message block
  const processFiles = useCallback(
    async (messageIndex: number, files: File[]) => {
      const templateId = templateEditorContext?.templateId;
      const sessionId = executionContext?.sessionId;

      if (!templateId && !sessionId) {
        addToast({ message: "テンプレートIDまたはセッションIDが取得できません", status: "error" });
        return;
      }

      const currentAttachments = data.messages[messageIndex].attachments;
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
          newAttachments.push({
            fileName: file.name,
            filePath,
            fileSize: file.size,
          });
        } catch (error) {
          console.error("Failed to write file:", error);
          addToast({ message: `ファイル「${file.name}」の保存に失敗しました`, status: "error" });
        }
      }

      if (newAttachments.length > 0) {
        const newMessages = [...data.messages];
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          attachments: [...currentAttachments, ...newAttachments],
        };
        updateNodeData(id, { messages: newMessages });
      }
    },
    [
      templateEditorContext,
      executionContext,
      data.messages,
      id,
      updateNodeData,
      addToast,
      removeMissingFilePath,
    ],
  );

  const handleFileAdd = async (
    messageIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await processFiles(messageIndex, Array.from(files));

    const inputRef = fileInputRefs.current.get(messageIndex);
    if (inputRef) {
      inputRef.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (messageIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const counter = (dragCounterRefs.current.get(messageIndex) ?? 0) + 1;
    dragCounterRefs.current.set(messageIndex, counter);

    if (e.dataTransfer.types.includes("Files")) {
      setDraggingIndex(messageIndex);
    }
  };

  const handleDragLeave = (messageIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const counter = (dragCounterRefs.current.get(messageIndex) ?? 1) - 1;
    dragCounterRefs.current.set(messageIndex, counter);

    if (counter === 0) {
      setDraggingIndex(null);
    }
  };

  const handleDrop = async (messageIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRefs.current.set(messageIndex, 0);
    setDraggingIndex(null);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    await processFiles(messageIndex, Array.from(files));
  };

  const handleFileRemove = async (messageIndex: number, fileIndex: number) => {
    const attachment = data.messages[messageIndex].attachments[fileIndex];
    const fs = new FileSystem();

    try {
      await fs.deleteFile(attachment.filePath);
    } catch (error) {
      console.error("Failed to delete file:", error);
      // Don't show error if file doesn't exist
    }

    const newMessages = [...data.messages];
    newMessages[messageIndex] = {
      ...newMessages[messageIndex],
      attachments: newMessages[messageIndex].attachments.filter((_, i) => i !== fileIndex),
    };
    updateNodeData(id, { messages: newMessages });
  };

  const handleSendMessage = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { bot, sessionId } = executionContext;

    const hasValidMessage = data.messages.some(
      (m) => m.content.trim() !== "" || m.attachments.length > 0,
    );
    if (!hasValidMessage) {
      addToast({ message: "メッセージまたはファイルを指定してください", status: "warning" });
      return;
    }

    // Resolve channel names from targets (direct name or flag-based lookup)
    let gameFlags: Record<string, string> = {};
    const hasFlagTargets = data.channelTargets.some((t) => t.type === "flagKey");
    if (hasFlagTargets) {
      const session = await GameSession.getById(sessionId);
      if (!session) {
        addToast({ message: "セッションが見つかりません", status: "error" });
        return;
      }
      gameFlags = session.getParsedGameFlags() as Record<string, string>;
    }

    const resolvedChannelNames: string[] = [];
    for (const target of data.channelTargets) {
      if (target.type === "channelName") {
        const name = target.value.trim();
        if (name !== "") resolvedChannelNames.push(name);
      } else {
        const flagKey = target.value.trim();
        if (flagKey === "") continue;
        const resolvedName = gameFlags[flagKey];
        if (resolvedName === undefined) {
          addToast({
            message: `フラグ「${flagKey}」が設定されていません`,
            status: "error",
          });
          return;
        }
        resolvedChannelNames.push(resolvedName);
      }
    }

    if (resolvedChannelNames.length === 0) {
      addToast({ message: "少なくとも1つのチャンネルを指定してください", status: "warning" });
      return;
    }

    const targetChannels: ChannelData[] = [];
    const notFoundChannels: string[] = [];

    for (const channelName of resolvedChannelNames) {
      const channel = channels.find((c) => c.name.toLowerCase() === channelName.toLowerCase());
      if (channel) {
        targetChannels.push(channel);
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

    if (targetChannels.length === 0) {
      addToast({ message: "対象チャンネルが見つかりません", status: "error" });
      return;
    }

    setIsLoading(true);

    const client = new ApiClient(bot.token);
    const fs = new FileSystem();

    try {
      for (const channel of targetChannels) {
        for (const message of data.messages) {
          if (message.content.trim() === "" && message.attachments.length === 0) {
            continue;
          }

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
            channelId: channel.id,
            content: message.content,
            files: files.length > 0 ? files : undefined,
          });
        }
      }

      addToast({
        message: `${targetChannels.length}個のチャンネルにメッセージを送信しました`,
        status: "success",
        durationSeconds: 5,
      });
      updateNodeData(id, { executedAt: new Date() });
    } catch (error) {
      console.error("Failed to send message:", error);
      addToast({
        message: "メッセージの送信に失敗しました",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isExecuteMode = mode === "execute";
  const isExecuted = !!data.executedAt;
  const hasMissingFiles = data.messages.some((m) =>
    m.attachments.some((a) => missingFilePaths.has(a.filePath)),
  );

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.SendMessage}
      className={cn(
        "bg-base-300",
        data.executedAt && "border-success bg-success/10",
        hasMissingFiles && "border-error bg-error/10",
      )}
    >
      <BaseNodeHeader>
        {isExecuteMode ? (
          <BaseNodeHeaderTitle>{data.title || "メッセージを送信する"}</BaseNodeHeaderTitle>
        ) : (
          <EditableTitle
            title={data.title}
            defaultTitle="メッセージを送信する"
            onTitleChange={handleTitleChange}
          />
        )}
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1 block">送信先チャンネル</label>
            {data.channelTargets.map((target, index) => (
              <div key={`${id}-channel-${index}`} className="mb-2 space-y-1">
                <div className="flex flex-wrap gap-2">
                  <label className="label cursor-pointer gap-1 p-0">
                    <input
                      type="radio"
                      name={`channel-type-${id}-${index}`}
                      className="nodrag radio radio-xs"
                      checked={target.type === "channelName"}
                      onChange={() => handleChannelTargetTypeChange(index, "channelName")}
                      disabled={isExecuteMode || isLoading || isExecuted}
                    />
                    <span className="label-text text-xs">チャンネル名</span>
                  </label>
                  <label className="label cursor-pointer gap-1 p-0">
                    <input
                      type="radio"
                      name={`channel-type-${id}-${index}`}
                      className="nodrag radio radio-xs"
                      checked={target.type === "flagKey"}
                      onChange={() => handleChannelTargetTypeChange(index, "flagKey")}
                      disabled={isExecuteMode || isLoading || isExecuted}
                    />
                    <span className="label-text text-xs">フラグから取得</span>
                  </label>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    {target.type === "channelName" ? (
                      <ResourceSelector
                        nodeId={id}
                        resourceType="channel"
                        value={target.value}
                        onChange={(newName) => handleChannelTargetChange(index, newName)}
                        placeholder="チャンネル名"
                        disabled={isExecuteMode || isLoading || isExecuted}
                        channelTypeFilter="text"
                      />
                    ) : (
                      <ResourceSelector
                        nodeId={id}
                        resourceType="gameFlag"
                        value={target.value}
                        onChange={(newKey) => handleChannelTargetChange(index, newKey)}
                        placeholder="フラグ名"
                        disabled={isExecuteMode || isLoading || isExecuted}
                      />
                    )}
                  </div>
                  {!isExecuteMode && data.channelTargets.length > 1 && (
                    <button
                      type="button"
                      className="nodrag btn btn-ghost btn-sm"
                      onClick={() => handleRemoveChannelTarget(index)}
                      disabled={isLoading || isExecuted}
                    >
                      削除
                    </button>
                  )}
                </div>
                {target.type === "flagKey" && (
                  <p className="text-xs text-warning">
                    フラグの値に一致するチャンネルが存在しない場合、送信に失敗します
                  </p>
                )}
              </div>
            ))}
            {!isExecuteMode && (
              <button
                type="button"
                className="nodrag btn btn-ghost btn-sm"
                onClick={handleAddChannelTarget}
                disabled={isLoading || isExecuted}
              >
                + チャンネルを追加
              </button>
            )}
          </div>

          {data.messages.map((message, messageIndex) => (
            <div
              key={`${id}-message-${messageIndex}`}
              className="border border-base-content/20 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!(isExecuteMode && message.content === "") && (
                    <span className="text-xs text-base-content/60">
                      {message.content.length}/2000
                    </span>
                  )}
                </div>
                {!isExecuteMode && data.messages.length > 1 && (
                  <button
                    type="button"
                    className="nodrag btn btn-ghost btn-xs"
                    onClick={() => handleRemoveMessageBlock(messageIndex)}
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
                  onChange={(e) => handleContentChange(messageIndex, e.target.value)}
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
                        key={`${id}-message-${messageIndex}-attachment-${fileIndex}`}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-1",
                          missingFilePaths.has(attachment.filePath)
                            ? "bg-error/20 border border-error/30"
                            : "bg-base-200",
                        )}
                      >
                        <span className="text-sm truncate flex-1">{attachment.fileName}</span>
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
                            onClick={() => handleFileRemove(messageIndex, fileIndex)}
                            disabled={isLoading || isExecuted}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {message.attachments.some((a) => a.fileSize > FILE_SIZE_WARNING_THRESHOLD) && (
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
                            if (el) fileInputRefs.current.set(messageIndex, el);
                          }}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileAdd(messageIndex, e)}
                          disabled={isLoading || isExecuted}
                        />
                        <div
                          className={cn(
                            "nodrag",
                            "flex flex-col items-center justify-center gap-1",
                            "rounded-lg border-2 p-4 cursor-pointer",
                            "transition-all duration-200",
                            draggingIndex === messageIndex
                              ? "border-primary bg-primary/10 border-solid"
                              : "border-dashed border-base-content/30 hover:border-base-content/50 hover:bg-base-200/50",
                            (isLoading || isExecuted) &&
                              "opacity-50 pointer-events-none cursor-not-allowed",
                          )}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(messageIndex, e)}
                          onDragLeave={(e) => handleDragLeave(messageIndex, e)}
                          onDrop={(e) => handleDrop(messageIndex, e)}
                          onClick={() =>
                            !isLoading &&
                            !isExecuted &&
                            fileInputRefs.current.get(messageIndex)?.click()
                          }
                        >
                          {draggingIndex === messageIndex ? (
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
          ))}

          {!isExecuteMode && (
            <button
              type="button"
              className="nodrag btn btn-outline btn-sm w-full"
              onClick={handleAddMessageBlock}
              disabled={isLoading || isExecuted}
            >
              + メッセージを追加
            </button>
          )}
        </div>
      </BaseNodeContent>

      <BaseNodeFooter>
        <button
          type="button"
          className="nodrag btn btn-primary"
          onClick={handleSendMessage}
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
