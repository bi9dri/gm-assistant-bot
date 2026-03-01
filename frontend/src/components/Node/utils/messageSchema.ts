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

const computeSHA256 = async (data: Blob): Promise<string> => {
  const buffer = await data.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
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

  const basePath = `${baseDir}/${file.name}`;

  let existingFile: File | null = null;
  try {
    existingFile = await fs.readFile(basePath);
  } catch {
    // file doesn't exist
  }

  if (existingFile) {
    const [existingHash, newHash] = await Promise.all([
      computeSHA256(existingFile),
      computeSHA256(file),
    ]);
    if (existingHash === newHash) {
      return basePath;
    }
    const randomDir = crypto.randomUUID().slice(0, 8);
    const newPath = `${baseDir}/${randomDir}/${file.name}`;
    await fs.writeFile(newPath, file);
    return newPath;
  }

  await fs.writeFile(basePath, file);
  return basePath;
};
