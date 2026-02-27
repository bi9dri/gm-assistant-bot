import z from "zod";

import { FileSystem } from "@/fileSystem";

export const AttachmentSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.number(),
});

export const MessageBlockSchema = z.object({
  content: z.string().max(2000),
  attachments: z.array(AttachmentSchema).max(4).default([]),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export const FILE_SIZE_WARNING_THRESHOLD = 1 * 1024 * 1024; // 1MB

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const saveFileToOPFS = async (
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

  if (await fs.fileExists(basePath)) {
    const randomDir = crypto.randomUUID().slice(0, 8);
    basePath = `${baseDir}/${randomDir}/${file.name}`;
  }

  await fs.writeFile(basePath, file);
  return basePath;
};
