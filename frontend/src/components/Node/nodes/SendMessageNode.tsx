import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { LuUpload, LuDownload } from "react-icons/lu";
import z from "zod";

import { ApiClient } from "@/api";
import { db, type ChannelData } from "@/db";
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
  cn,
} from "../base";
import { BaseNodeDataSchema, NODE_CONTENT_HEIGHTS, NODE_TYPE_WIDTHS } from "../base";
import { useNodeExecutionOptional, useTemplateEditorContextOptional } from "../contexts";
import { ResourceSelector } from "../utils";

const AttachmentSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.number(),
});

const MessageBlockSchema = z.object({
  content: z.string().max(2000),
  attachments: z.array(AttachmentSchema).max(4).default([]),
});

export const DataSchema = BaseNodeDataSchema.extend({
  channelNames: z.array(z.string().trim()).min(1).default([""]),
  messages: z
    .array(MessageBlockSchema)
    .min(1)
    .default([{ content: "", attachments: [] }]),
});

type SendMessageNodeData = Node<z.infer<typeof DataSchema>, "SendMessage">;
type Attachment = z.infer<typeof AttachmentSchema>;

const FILE_SIZE_WARNING_THRESHOLD = 1 * 1024 * 1024; // 1MB

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const saveFileToOPFS = async (
  file: File,
  options: { templateId?: number; sessionId?: number },
): Promise<string> => {
  const { templateId, sessionId } = options;
  const fs = new FileSystem();

  let baseDir: string;
  if (sessionId !== undefined) {
    baseDir = `session/${sessionId}`;
  } else if (templateId !== undefined) {
    baseDir = `template/${templateId}`;
  } else {
    throw new Error("templateIdまたはsessionIdが必要です");
  }

  let basePath = `${baseDir}/${file.name}`;

  // If file exists, create a random subdirectory
  if (await fs.fileExists(basePath)) {
    const randomDir = crypto.randomUUID().slice(0, 8);
    basePath = `${baseDir}/${randomDir}/${file.name}`;
  }

  await fs.writeFile(basePath, file);
  return basePath;
};

export const SendMessageNode = ({
  id,
  data,
  mode = "edit",
}: NodeProps<SendMessageNodeData> & { mode?: "edit" | "execute" }) => {
  const updateNodeData = useTemplateEditorStore((state) => state.updateNodeData);
  const templateEditorContext = useTemplateEditorContextOptional();
  const executionContext = useNodeExecutionOptional();
  const { addToast } = useToast();

  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const dragCounterRefs = useRef<Map<number, number>>(new Map());

  const [channels, setChannels] = useState<ChannelData[]>([]);
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

  const handleChannelNameChange = (index: number, value: string) => {
    const newChannelNames = [...data.channelNames];
    newChannelNames[index] = value;
    updateNodeData(id, { channelNames: newChannelNames });
  };

  const handleAddChannelName = () => {
    const newChannelNames = [...data.channelNames, ""];
    updateNodeData(id, { channelNames: newChannelNames });
  };

  const handleRemoveChannelName = (index: number) => {
    if (data.channelNames.length <= 1) {
      addToast({ message: "最低1つのチャンネルが必要です", status: "warning" });
      return;
    }
    const newChannelNames = data.channelNames.filter((_, i) => i !== index);
    updateNodeData(id, { channelNames: newChannelNames });
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
    [templateEditorContext, executionContext, data.messages, id, updateNodeData, addToast],
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

    const { bot } = executionContext;

    // Validate channel names
    const validChannelNames = data.channelNames
      .map((name) => name.trim())
      .filter((name) => name !== "");

    if (validChannelNames.length === 0) {
      addToast({ message: "少なくとも1つのチャンネル名を入力してください", status: "warning" });
      return;
    }

    const hasValidMessage = data.messages.some(
      (m) => m.content.trim() !== "" || m.attachments.length > 0,
    );
    if (!hasValidMessage) {
      addToast({ message: "メッセージまたはファイルを指定してください", status: "warning" });
      return;
    }

    // Find all target channels
    const targetChannels: ChannelData[] = [];
    const notFoundChannels: string[] = [];

    for (const channelName of validChannelNames) {
      const channel = channels.find((c) => c.name === channelName);
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
          // Skip empty messages
          if (message.content.trim() === "" && message.attachments.length === 0) {
            continue;
          }

          // Read files from OPFS for this message
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

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.SendMessage}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>メッセージを送信する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent maxHeight={NODE_CONTENT_HEIGHTS.md}>
        <div className="space-y-3">
          {/* Channel names input */}
          <div>
            <label className="text-xs font-semibold mb-1 block">送信先チャンネル</label>
            {data.channelNames.map((name, index) => (
              <div key={`${id}-channel-${index}`} className="flex gap-2 items-center mb-2">
                <div className="flex-1">
                  <ResourceSelector
                    nodeId={id}
                    resourceType="channel"
                    value={name}
                    onChange={(newName) => handleChannelNameChange(index, newName)}
                    placeholder="チャンネル名"
                    disabled={isExecuteMode || isLoading || isExecuted}
                    channelTypeFilter="text"
                  />
                </div>
                {!isExecuteMode && data.channelNames.length > 1 && (
                  <button
                    type="button"
                    className="nodrag btn btn-ghost btn-sm"
                    onClick={() => handleRemoveChannelName(index)}
                    disabled={isLoading || isExecuted}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            {!isExecuteMode && (
              <button
                type="button"
                className="nodrag btn btn-ghost btn-sm"
                onClick={handleAddChannelName}
                disabled={isLoading || isExecuted}
              >
                + チャンネルを追加
              </button>
            )}
          </div>

          {/* Message blocks */}
          {data.messages.map((message, messageIndex) => (
            <div
              key={`${id}-message-${messageIndex}`}
              className="border border-base-content/20 rounded-lg p-3 space-y-2"
            >
              {/* Message header with delete button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-base-content/60">
                    {message.content.length}/2000
                  </span>
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

              {/* Message input */}
              <textarea
                className="nodrag textarea textarea-bordered w-full h-24"
                value={message.content}
                onChange={(e) => handleContentChange(messageIndex, e.target.value)}
                placeholder="メッセージを入力"
                maxLength={2000}
                disabled={isExecuteMode || isLoading || isExecuted}
              />

              {/* Attachments for this message */}
              <div>
                <label className="text-xs font-semibold mb-1 block">
                  添付ファイル ({message.attachments.length}/4)
                </label>

                {/* File list */}
                {message.attachments.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {message.attachments.map((attachment, fileIndex) => (
                      <div
                        key={`${id}-message-${messageIndex}-attachment-${fileIndex}`}
                        className="flex items-center gap-2 bg-base-200 rounded px-2 py-1"
                      >
                        <span className="text-sm truncate flex-1">{attachment.fileName}</span>
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

                {/* File size warning message */}
                {message.attachments.some((a) => a.fileSize > FILE_SIZE_WARNING_THRESHOLD) && (
                  <p className="text-xs text-warning mb-2">
                    1MBを超えるファイルがあります。圧縮などでサイズを最適化することをお勧めします。
                  </p>
                )}

                {/* Drop zone / Add file */}
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
                      disabled={isExecuteMode || isLoading || isExecuted}
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
                        (isExecuteMode || isLoading || isExecuted) &&
                          "opacity-50 pointer-events-none cursor-not-allowed",
                      )}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(messageIndex, e)}
                      onDragLeave={(e) => handleDragLeave(messageIndex, e)}
                      onDrop={(e) => handleDrop(messageIndex, e)}
                      onClick={() =>
                        !isExecuteMode &&
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
              </div>
            </div>
          ))}

          {/* Add message block button */}
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

          {/* Available channels display (execute mode) */}
          {isExecuteMode && channels.length > 0 && (
            <p className="text-xs text-base-content/60">
              利用可能なチャンネル: {channels.map((c) => c.name).join(", ")}
            </p>
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

      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
