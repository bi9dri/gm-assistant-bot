import type { JSONContent } from "@tiptap/core";

import type { Step } from "@/flow/schema";

// 段落・見出し・箇条書き・強調・ハイライト・引用と、文中の操作チップ・ブロック分岐を
// 1 本に含むシナリオドキュメント UI 用のサンプル。VRT stories の共通シード。

export const sampleSteps: Step[] = [
  {
    id: "cr",
    type: "CreateRole",
    title: "ロール作成",
    memo: "",
    autoAdvance: true,
    roles: ["探索者", "GM"],
  },
  {
    id: "sm",
    type: "SendMessage",
    title: "開始メッセージ",
    memo: "",
    autoAdvance: false,
    channelTargets: [{ type: "channelName", value: "全体" }],
    messages: [{ content: "調査を開始します", attachments: [] }],
  },
  {
    id: "br",
    type: "Branch",
    title: "証拠を見つけたか",
    memo: "",
    autoAdvance: false,
    mode: "select",
    matchMode: "first",
    flagName: "evidence",
    branches: [
      {
        id: "a1",
        label: "見つけた",
        steps: [
          {
            id: "ct",
            type: "Counter",
            title: "周回カウント",
            memo: "",
            autoAdvance: false,
            flagKey: "round",
            step: 1,
          },
        ],
      },
      { id: "a2", label: "見つけていない", steps: [] },
    ],
  },
];

const stepNode = (stepId: string): JSONContent => ({ type: "step", attrs: { stepId } });

export const sampleDoc: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "導入" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "館に着いた頃には日が暮れていた。扉を叩くと執事が現れる。まず " },
        stepNode("cr"),
        { type: "text", text: " を済ませ、" },
        { type: "text", marks: [{ type: "bold" }], text: "全員の準備を確認する" },
        { type: "text", text: "。" },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "注意: " },
            { type: "text", marks: [{ type: "highlight" }], text: "執事の正体は伏せること" },
          ],
        },
      ],
    },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "調査フェーズ" }] },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "書斎を調べる" }] }],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "地下室は鍵がかかっている" }],
            },
          ],
        },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "準備ができたら " }, stepNode("sm")] },
    { type: "branch", attrs: { stepId: "br" } },
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "解決" }] },
    { type: "paragraph", content: [{ type: "text", text: "犯人は執事だった。" }] },
  ],
};

// フラグ値は string (evaluateCondition / DynamicValue が string 前提)。実行モードの
// ライブフラグにもそのまま渡せる。
export const sampleGameFlags: Record<string, string> = { evidence: "見つけた", round: "1" };

// 実行モード用に実行痕跡を載せたステップ列。実行済み ✓ と確定枝 (a1) を撮れるようにしてある。
const EXECUTED_AT = new Date("2026-01-01T00:00:00.000Z");

export const executedSampleSteps: Step[] = sampleSteps.map((step) =>
  step.id === "cr"
    ? { ...step, executedAt: EXECUTED_AT }
    : step.type === "Branch"
      ? { ...step, executedAt: EXECUTED_AT, executedBranchIds: ["a1"] }
      : step,
);
