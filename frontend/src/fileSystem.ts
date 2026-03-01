import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";

import { db, Template, type ReactFlowData } from "./db";

type Attachment = { filePath: string };
type MessageWithAttachments = { attachments: Attachment[] };
type EntryWithMessages = { messages: MessageWithAttachments[] };

export function convertFilePathsInReactFlowData(
  reactFlowData: ReactFlowData,
  replacer: (filePath: string) => string,
): ReactFlowData {
  const convertAttachments = (attachments: Attachment[]) =>
    attachments.map((a) => ({ ...a, filePath: replacer(a.filePath) }));

  const convertMessages = (messages: MessageWithAttachments[]) =>
    messages.map((msg) => ({
      ...msg,
      attachments: Array.isArray(msg.attachments)
        ? convertAttachments(msg.attachments)
        : msg.attachments,
    }));

  const newNodes = reactFlowData.nodes.map((node) => {
    if (node.type === "SendMessage" && Array.isArray(node.data?.messages)) {
      return {
        ...node,
        data: {
          ...node.data,
          messages: convertMessages(node.data.messages as MessageWithAttachments[]),
        },
      };
    }
    if (node.type === "CombinationSendMessage" && Array.isArray(node.data?.entries)) {
      return {
        ...node,
        data: {
          ...node.data,
          entries: (node.data.entries as EntryWithMessages[]).map((entry) => ({
            ...entry,
            messages: Array.isArray(entry.messages)
              ? convertMessages(entry.messages)
              : entry.messages,
          })),
        },
      };
    }
    return node;
  });

  return { ...reactFlowData, nodes: newNodes };
}

export class FileSystem {
  constructor() {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      throw new Error("ブラウザのファイルシステムを利用できません");
    }
  }

  async exportTemplate(templateId: number) {
    const template = (await db.Template.get(templateId)) as Template | undefined;
    if (!template) {
      throw new Error("テンプレートが見つかりません");
    }

    const templateData = template.export();
    const convertedTemplateData = {
      ...templateData,
      reactFlowData: convertFilePathsInReactFlowData(templateData.reactFlowData, (filePath) =>
        filePath.replace(`template/${templateId}/`, "files/"),
      ),
    };

    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);

    await zipWriter.add("template.json", new TextReader(JSON.stringify(convertedTemplateData)));

    const root = await navigator.storage.getDirectory();

    const addFile = async (handle: FileSystemHandle) => {
      const segments = await root.resolve(handle);
      if (!segments) {
        throw new Error("ファイルのパス解決に失敗しました");
      }
      // segments: ["template", "{id}", ...rest] → ZIP path: "files/" + rest
      const zipPath = "files/" + segments.slice(2).join("/");
      const blob = await (handle as FileSystemFileHandle).getFile();
      await zipWriter.add(zipPath, new BlobReader(blob));
    };

    const walkAndAddFiles = async (dir: FileSystemDirectoryHandle) => {
      for await (const handle of dir.values()) {
        if (handle.kind === "file") {
          await addFile(handle);
          continue;
        }
        await walkAndAddFiles(handle as FileSystemDirectoryHandle);
      }
    };

    let dir: FileSystemDirectoryHandle;
    try {
      // ディレクトリを1つずつ取得しないとNotAllowedErrorになるブラウザがある
      const td = await root.getDirectoryHandle("template");
      dir = await td.getDirectoryHandle(`${templateId}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") {
        // No files to add
        await zipWriter.close();
        return zipFileWriter.getData();
      }
      console.error("Failed to get template directory:", e);
      throw e;
    }

    await walkAndAddFiles(dir);
    await zipWriter.close();
    return zipFileWriter.getData();
  }

  async importTemplate(zipFile: File) {
    const zipFileReader = new BlobReader(zipFile);
    const zipReader = new ZipReader(zipFileReader);

    let templateData: unknown = null;
    let oldTemplateId: number | null = null;

    // First pass: read template.json and detect old-format IDs (backward compat)
    for await (const entry of zipReader.getEntriesGenerator()) {
      if (!entry.directory && entry.filename === "template.json") {
        const templateJson = await entry.getData(new TextWriter());
        try {
          templateData = JSON.parse(templateJson);
        } catch {
          throw new Error("テンプレートデータが壊れています");
        }
      } else if (!entry.directory && entry.filename.startsWith("template/")) {
        // Old format: template/{oldId}/file — extract the old ID
        const parts = entry.filename.split("/");
        if (parts.length >= 3) {
          const id = parseInt(parts[1], 10);
          if (!isNaN(id)) {
            oldTemplateId = id;
          }
        }
      }
    }

    const template = await Template.import(templateData);
    const newId = template.id;

    // Second pass: write files with paths converted to the new template ID
    for await (const entry of zipReader.getEntriesGenerator()) {
      if (entry.filename === "template.json" || entry.directory) {
        continue;
      }

      let targetPath: string | null = null;
      if (entry.filename.startsWith("files/")) {
        // New format: files/xxx → template/{newId}/xxx
        targetPath = `template/${newId}/${entry.filename.slice("files/".length)}`;
      } else if (
        oldTemplateId !== null &&
        entry.filename.startsWith(`template/${oldTemplateId}/`)
      ) {
        // Old format (backward compat): template/{oldId}/xxx → template/{newId}/xxx
        targetPath = `template/${newId}/${entry.filename.slice(`template/${oldTemplateId}/`.length)}`;
      }

      if (!targetPath) continue;

      const file = await entry.getData(new BlobWriter());
      await this.writeFile(targetPath, file);
    }

    // Rewrite filePaths in reactFlowData to point to the new template ID
    const oldReactFlowData = template.getParsedReactFlowData();
    const newReactFlowData = convertFilePathsInReactFlowData(oldReactFlowData, (filePath) => {
      if (filePath.startsWith("files/")) {
        return `template/${newId}/${filePath.slice("files/".length)}`;
      }
      if (oldTemplateId !== null && filePath.startsWith(`template/${oldTemplateId}/`)) {
        return `template/${newId}/${filePath.slice(`template/${oldTemplateId}/`.length)}`;
      }
      return filePath;
    });
    await template.update({ reactFlowData: newReactFlowData });

    return template;
  }

  async clearTemplateFiles(templateId: number) {
    const root = await navigator.storage.getDirectory();
    try {
      // ディレクトリを1つずつ取得しないとNotAllowedErrorになるブラウザがある
      const td = await root.getDirectoryHandle("template");
      await td.removeEntry(`${templateId}`, { recursive: true });
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") {
        return;
      }
      throw e;
    }
  }

  async writeFile(path: string, data: Blob | string) {
    // ディレクトリを1つずつ取得しないとNotAllowedErrorになるブラウザがある
    let dir = await navigator.storage.getDirectory();
    const segments = path.split("/").filter((seg) => seg.length > 0);
    while (segments.length > 1) {
      const dirName = segments.shift() as string;
      if (dirName.length === 0) {
        continue;
      }
      dir = await dir.getDirectoryHandle(dirName, { create: true });
    }

    const fileName = segments.shift() as string;
    const handle = await dir.getFileHandle(fileName, { create: true });
    const w = await handle.createWritable();
    await w.write(data);
    await w.close();
  }

  async readFile(path: string) {
    // ディレクトリを1つずつ取得しないとNotAllowedErrorになるブラウザがある
    let dir = await navigator.storage.getDirectory();
    const segments = path.split("/").filter((seg) => seg.length > 0);
    while (segments.length > 1) {
      const dirName = segments.shift() as string;
      if (dirName.length === 0) {
        continue;
      }
      dir = await dir.getDirectoryHandle(dirName);
    }

    const fileName = segments.shift() as string;
    const handle = await dir.getFileHandle(fileName);
    const file = await handle.getFile();
    return file;
  }

  async deleteFile(path: string) {
    // ディレクトリを1つずつ取得しないとNotAllowedErrorになるブラウザがある
    let dir = await navigator.storage.getDirectory();
    const segments = path.split("/").filter((seg) => seg.length > 0);
    while (segments.length > 1) {
      const dirName = segments.shift() as string;
      if (dirName.length === 0) {
        continue;
      }
      dir = await dir.getDirectoryHandle(dirName);
    }

    const fileName = segments.shift() as string;
    await dir.removeEntry(fileName);
  }

  async fileExists(path: string) {
    try {
      await this.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  async clearSessionFiles(sessionId: number) {
    const root = await navigator.storage.getDirectory();
    try {
      const sd = await root.getDirectoryHandle("session");
      await sd.removeEntry(`${sessionId}`, { recursive: true });
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") {
        return;
      }
      throw e;
    }
  }

  async copyTemplateFilesToSession(templateId: number, sessionId: number) {
    const root = await navigator.storage.getDirectory();

    let sourceDir: FileSystemDirectoryHandle;
    try {
      const td = await root.getDirectoryHandle("template");
      sourceDir = await td.getDirectoryHandle(`${templateId}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") {
        return; // No files in template
      }
      throw e;
    }

    const sd = await root.getDirectoryHandle("session", { create: true });
    const destDir = await sd.getDirectoryHandle(`${sessionId}`, { create: true });

    await this.copyDirectory(sourceDir, destDir);
  }

  private async copyDirectory(source: FileSystemDirectoryHandle, dest: FileSystemDirectoryHandle) {
    for await (const handle of source.values()) {
      if (handle.kind === "file") {
        const file = await (handle as FileSystemFileHandle).getFile();
        const destHandle = await dest.getFileHandle(handle.name, { create: true });
        const w = await destHandle.createWritable();
        await w.write(file);
        await w.close();
      } else {
        const subDir = await dest.getDirectoryHandle(handle.name, { create: true });
        await this.copyDirectory(handle as FileSystemDirectoryHandle, subDir);
      }
    }
  }
}
