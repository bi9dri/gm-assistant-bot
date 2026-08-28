import type { Step } from "@/flow/schema";

import { buildOutline, type OutlineNode } from "../outline";

// Heading から自動生成する目次 (docs: scenario-editor-architecture D22)。
// クリックで本文の該当ブロックへスクロールする。

const scrollToBlock = (id: string) => {
  const target = document.getElementById(`block-${id}`);
  if (target === null) return;
  // 畳まれた見出しの中にある行は箱を持たず scrollIntoView が効かない。祖先の
  // <details> を開いてから飛ぶ (open の変更は toggle イベント経由で store にも届く)。
  for (
    let details = target.parentElement?.closest("details");
    details != null;
    details = details.parentElement?.closest("details") ?? null
  ) {
    details.open = true;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
};

const TocNodes = ({ nodes }: { nodes: OutlineNode[] }) => (
  <ul className="flex flex-col gap-1">
    {nodes.flatMap((node) =>
      node.kind === "block"
        ? []
        : [
            <li key={node.heading.id}>
              <button
                type="button"
                className="link-hover link block w-full truncate text-left text-sm"
                onClick={() => scrollToBlock(node.heading.id)}
              >
                {node.heading.title.trim() === "" ? "(無題)" : node.heading.title}
              </button>
              {node.children.length > 0 && (
                <div className="ml-3 border-l border-base-300 pl-2">
                  <TocNodes nodes={node.children} />
                </div>
              )}
            </li>,
          ],
    )}
  </ul>
);

export const TableOfContents = ({ blocks }: { blocks: Step[] }) => {
  const outline = buildOutline(blocks);
  const hasHeading = outline.some((node) => node.kind === "section");

  return (
    <nav className="flex flex-col gap-2 p-3" aria-label="目次">
      <h3 className="text-sm font-semibold">目次</h3>
      {hasHeading ? (
        <TocNodes nodes={outline} />
      ) : (
        <p className="text-xs text-base-content/40">見出しがありません</p>
      )}
    </nav>
  );
};
