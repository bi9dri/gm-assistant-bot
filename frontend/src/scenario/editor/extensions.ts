import Highlight from "@tiptap/extension-highlight";
import StarterKit from "@tiptap/starter-kit";

import { BranchNode } from "./BranchNode";
import { StepNode } from "./StepNode";

// 本文が持てる要素 (docs: scenario-editor-architecture D20)。schema による
// ホワイトリストが「ユーザ入力から任意のタグを持ち込ませない」を構造的に満たすため
// (D23)、まだ使わない要素は StarterKit 側で明示的に落としておく。
export const scenarioExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // リンク・テーブル・インライン画像は当面持たない (スコープ外)。link は href を
    // 貼り付けから持ち込める唯一の経路でもあるため、ここで閉じておく。
    link: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    italic: false,
    strike: false,
    underline: false,
  }),
  // 見落とし防止の強調 (D20)。色は 1 種類だけなので multicolor にしない。
  Highlight,
  StepNode,
  BranchNode,
];
