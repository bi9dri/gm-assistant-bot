import { useEffect } from "react";

import { FileSystem } from "@/fileSystem";
import { useTemplateEditorStore, type FlowNode } from "@/stores/templateEditorStore";
import { useToast } from "@/toast/ToastProvider";

function collectAllFilePaths(nodes: FlowNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === "SendMessage") {
      for (const message of node.data.messages) {
        for (const attachment of message.attachments) {
          paths.push(attachment.filePath);
        }
      }
    } else if (node.type === "CombinationSendMessage") {
      for (const entry of node.data.entries) {
        for (const message of entry.messages) {
          for (const attachment of message.attachments) {
            paths.push(attachment.filePath);
          }
        }
      }
    }
  }
  return paths;
}

export function useFileExistenceValidation() {
  const initialized = useTemplateEditorStore((state) => state.initialized);
  const { addToast } = useToast();

  useEffect(() => {
    if (!initialized) return;

    let aborted = false;

    const validate = async () => {
      let fs: FileSystem;
      try {
        fs = new FileSystem();
      } catch {
        return;
      }

      const { nodes, setMissingFilePaths } = useTemplateEditorStore.getState();
      const allPaths = collectAllFilePaths(nodes);
      if (allPaths.length === 0) {
        setMissingFilePaths(new Set());
        return;
      }

      const results = await Promise.all(
        allPaths.map(async (path) => ({ path, exists: await fs.fileExists(path) })),
      );

      if (aborted) return;

      const missing = new Set(results.filter((r) => !r.exists).map((r) => r.path));
      setMissingFilePaths(missing);
      if (missing.size > 0) {
        addToast({
          message: `${missing.size}個の添付ファイルが見つかりません。該当ノードを確認してください。`,
          status: "error",
        });
      }
    };

    void validate();

    return () => {
      aborted = true;
    };
    // Intentionally run only once when initialized becomes true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);
}
