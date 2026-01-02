import { Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState, useRef } from "react";
import z from "zod";

import { db, type ChannelData } from "@/db";
import { DiscordClient } from "@/discord";
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
} from "./base-node";
import { BaseNodeDataSchema, NODE_TYPE_WIDTHS } from "./base-schema";
import { useNodeExecutionOptional } from "./NodeExecutionContext";
import { useTemplateEditorContextOptional } from "./TemplateEditorContext";

const AttachmentSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.number(),
});

export const DataSchema = BaseNodeDataSchema.extend({
  channelName: z.string().trim(),
  content: z.string(),
  attachments: z.array(AttachmentSchema).max(4).default([]),
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get channel list in execute mode
  useEffect(() => {
    if (executionContext) {
      void db.Channel.where("sessionId")
        .equals(executionContext.sessionId)
        .toArray()
        .then(setChannels);
    }
  }, [executionContext]);

  // Channel name change handler
  const handleChannelNameChange = (value: string) => {
    updateNodeData(id, { channelName: value });
  };

  // Message content change handler
  const handleContentChange = (value: string) => {
    updateNodeData(id, { content: value });
  };

  // File add handler
  const handleFileAdd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const templateId = templateEditorContext?.templateId;
    const sessionId = executionContext?.sessionId;

    if (!templateId && !sessionId) {
      addToast({ message: "テンプレートIDまたはセッションIDが取得できません", status: "error" });
      return;
    }

    const remainingSlots = 4 - data.attachments.length;
    if (remainingSlots <= 0) {
      addToast({ message: "添付ファイルは最大4つまでです", status: "warning" });
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);
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
      updateNodeData(id, {
        attachments: [...data.attachments, ...newAttachments],
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // File remove handler
  const handleFileRemove = async (index: number) => {
    const attachment = data.attachments[index];
    const fs = new FileSystem();

    try {
      await fs.deleteFile(attachment.filePath);
    } catch (error) {
      console.error("Failed to delete file:", error);
      // Don't show error if file doesn't exist
    }

    const newAttachments = data.attachments.filter((_, i) => i !== index);
    updateNodeData(id, { attachments: newAttachments });
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (!executionContext) {
      addToast({ message: "実行コンテキストがありません", status: "error" });
      return;
    }

    const { bot } = executionContext;

    // Validation
    if (data.channelName.trim() === "") {
      addToast({ message: "チャンネル名を入力してください", status: "warning" });
      return;
    }

    if (data.content.trim() === "" && data.attachments.length === 0) {
      addToast({ message: "メッセージまたはファイルを指定してください", status: "warning" });
      return;
    }

    // Find channel
    const channel = channels.find((c) => c.name === data.channelName.trim());
    if (!channel) {
      addToast({
        message: `チャンネル「${data.channelName}」が見つかりません`,
        status: "error",
      });
      return;
    }

    setIsLoading(true);

    // Read files from OPFS
    const fs = new FileSystem();
    const files: File[] = [];

    for (const attachment of data.attachments) {
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

    const client = new DiscordClient(bot.token);

    try {
      await client.sendMessage({
        channelId: channel.id,
        content: data.content,
        files: files.length > 0 ? files : undefined,
      });

      addToast({
        message: "メッセージを送信しました",
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

  return (
    <BaseNode
      width={NODE_TYPE_WIDTHS.SendMessage}
      className={cn("bg-base-300", data.executedAt && "border-success bg-success/10")}
    >
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>メッセージを送信する</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <div className="space-y-3">
          {/* Channel name input */}
          <div>
            <label className="text-xs font-semibold mb-1 block">送信先チャンネル</label>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              value={data.channelName}
              onChange={(e) => handleChannelNameChange(e.target.value)}
              placeholder="チャンネル名"
              disabled={isLoading}
            />
          </div>

          {/* Message input */}
          <div>
            <label className="text-xs font-semibold mb-1 block">メッセージ</label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              value={data.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="メッセージを入力"
              disabled={isLoading}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-xs font-semibold mb-1 block">
              添付ファイル ({data.attachments.length}/4)
            </label>

            {/* File list */}
            {data.attachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {data.attachments.map((attachment, index) => (
                  <div
                    key={`${id}-attachment-${index}`}
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
                        ⚠
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleFileRemove(index)}
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File size warning message */}
            {data.attachments.some((a) => a.fileSize > FILE_SIZE_WARNING_THRESHOLD) && (
              <p className="text-xs text-warning mb-2">
                1MBを超えるファイルがあります。圧縮などでサイズを最適化することをお勧めします。
              </p>
            )}

            {/* Add file button */}
            {data.attachments.length < 4 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileAdd}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  + ファイルを追加
                </button>
              </>
            )}
          </div>

          {/* Available channels display (execute mode) */}
          {isExecuteMode && channels.length > 0 && (
            <p className="text-xs text-base-content/60">
              利用可能なチャンネル: {channels.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>
      </BaseNodeContent>

      {isExecuteMode && (
        <BaseNodeFooter>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendMessage}
            disabled={isLoading || !!data.executedAt}
          >
            {isLoading && <span className="loading loading-spinner loading-sm"></span>}
            送信
          </button>
        </BaseNodeFooter>
      )}

      <BaseHandle id="target-1" type="target" position={Position.Top} />
      <BaseHandle id="source-1" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};
