import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";

import { db, Template } from "./db";

export class FileSystem {
  constructor() {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      throw new Error("ブラウザのファイルシステムを利用できません");
    }
  }

  async saveTemplate(templateId: number) {
    const template = (await db.Template.get(templateId)) as Template | undefined;
    if (!template) {
      throw new Error("テンプレートが見つかりません");
    }

    const templateData = template.export();

    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);

    await zipWriter.add("template.json", new TextReader(JSON.stringify(templateData)));

    const root = await navigator.storage.getDirectory();

    const addFile = async (handle: FileSystemHandle) => {
      const aPath = (await root.resolve(handle))?.join("/");
      if (!aPath) {
        throw new Error("ファイルのパス解決に失敗しました");
      }
      const blob = await (handle as FileSystemFileHandle).getFile();
      await zipWriter.add(aPath, new BlobReader(blob));
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

  async loadTemplate(zipFile: File) {
    const zipFileReader = new BlobReader(zipFile);
    const zipReader = new ZipReader(zipFileReader);

    const root = await navigator.storage.getDirectory();

    let templateData: unknown = null;

    for await (const entry of zipReader.getEntriesGenerator()) {
      if (!entry.directory && entry.filename === "template.json") {
        const templateJson = await entry.getData(new TextWriter());
        try {
          templateData = JSON.parse(templateJson);
        } catch {
          throw new Error("テンプレートデータが壊れています");
        }
        break;
      }
    }

    const template = await Template.import(templateData);
    // ディレクトリを1つずつ取得しないとNotAllowedErrorになるブラウザがある
    const td = await root.getDirectoryHandle("template", { create: true });
    const dir = await td.getDirectoryHandle(`${template.id}`, { create: true });

    for await (const entry of zipReader.getEntriesGenerator()) {
      if (entry.filename === "template.json") {
        continue;
      }
      if (entry.directory) {
        await dir.getDirectoryHandle(entry.filename, { create: true });
        continue;
      }

      const file = await entry.getData(new BlobWriter());
      const handle = await dir.getFileHandle(entry.filename, { create: true });
      const w = await handle.createWritable();
      await w.write(file);
      await w.close();
    }

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
}
