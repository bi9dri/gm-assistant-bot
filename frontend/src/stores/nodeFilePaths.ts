import type { FlowNode } from "./templateEditorStore";

export function collectFilePathsFromNode(node: FlowNode): string[] {
  if (node.type === "SendMessage") {
    return node.data.messages.flatMap((message) =>
      message.attachments.map((attachment) => attachment.filePath),
    );
  }
  if (node.type === "CombinationSendMessage") {
    return node.data.entries.flatMap((entry) =>
      entry.messages.flatMap((message) =>
        message.attachments.map((attachment) => attachment.filePath),
      ),
    );
  }
  return [];
}

export function collectFilePathsFromNodes(nodes: FlowNode[]): string[] {
  return nodes.flatMap(collectFilePathsFromNode);
}
