import type { JSONContent } from "@tiptap/core";

import { buildOutline } from "../outline";
import { scrollToHeading } from "../scrollTo";

// heading ノードから自動生成する目次 (docs: scenario-editor-architecture D22)。
// 全文が常に展開されているので折りたたみもアプリ内検索も持たず、飛び先だけを提供する。

const INDENT: Record<number, string> = { 1: "", 2: "pl-3", 3: "pl-6" };

export const TableOfContents = ({
  doc,
  // 実行モードだけが渡す「ここから再実行」(docs: scenario-editor-architecture D9)。
  // heading ノードは id を持てないので、ボタンは本文ではなく目次側に置く。
  onRestart,
}: {
  doc: JSONContent;
  onRestart?: (headingIndex: number) => void;
}) => {
  const outline = buildOutline(doc);

  return (
    <nav className="flex flex-col gap-2 p-3" aria-label="目次">
      <h3 className="text-sm font-semibold">目次</h3>
      {outline.length === 0 ? (
        <p className="text-xs text-base-content/40">見出しがありません</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {outline.map((entry) => (
            <li
              key={entry.index}
              className={`flex items-center gap-1 ${INDENT[entry.level] ?? ""}`}
            >
              <button
                type="button"
                className="link-hover link min-w-0 flex-1 truncate text-left text-sm"
                onClick={() => scrollToHeading(entry.index)}
              >
                {entry.text.trim() === "" ? "(無題)" : entry.text}
              </button>
              {onRestart !== undefined && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs shrink-0"
                  title="この見出しの配下の実行・スキップの記録を消して、ここからやり直す"
                  onClick={() => onRestart(entry.index)}
                >
                  ⟲
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};
