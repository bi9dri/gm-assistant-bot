import type { Step } from "@/flow/schema";

// 見出し階層 (H1 > H2)・本文・Discord 操作ブロック・ツール・Branch ネストを 1 本に含む
// シナリオドキュメント UI 用のサンプル。VRT stories の共通シード。
export const sampleBlocks: Step[] = [
  {
    id: "h1",
    type: "Heading",
    title: "導入",
    memo: "",
    autoAdvance: false,
    level: 1,
    collapsed: false,
  },
  {
    id: "t1",
    type: "Text",
    title: "本文",
    memo: "",
    autoAdvance: false,
    body: "館に着いた頃には日が暮れていた。\n扉を叩くと、執事が現れる。",
  },
  {
    id: "cr",
    type: "CreateRole",
    title: "ロール作成",
    memo: "",
    autoAdvance: true,
    roles: ["探索者", "GM"],
  },
  {
    id: "h2",
    type: "Heading",
    title: "調査フェーズ",
    memo: "",
    autoAdvance: false,
    level: 2,
    collapsed: false,
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
            id: "t2",
            type: "Text",
            title: "本文",
            memo: "",
            autoAdvance: false,
            body: "血痕が階段に続いている。",
          },
        ],
      },
      { id: "a2", label: "見つけていない", steps: [] },
    ],
  },
  {
    id: "h3",
    type: "Heading",
    title: "解決 (折りたたみ)",
    memo: "",
    autoAdvance: false,
    level: 1,
    collapsed: true,
  },
  {
    id: "ct",
    type: "Counter",
    title: "周回カウント",
    memo: "",
    autoAdvance: false,
    flagKey: "round",
    step: 1,
  },
];

export const sampleGameFlags: Record<string, unknown> = { evidence: "見つけた", round: "1" };

// 実行モード (ScenarioRunner) 用に実行痕跡を載せたブロック列。実行済み ✓ とスキップ ⏭、
// カーソル ▶、Branch の確定枝 (a1) を 1 本で撮れるようにしてある。
const EXECUTED_AT = new Date("2026-01-01T00:00:00.000Z");
const EXECUTED_BLOCK_IDS = new Set(["h1", "t1", "cr", "h2"]);

export const executedSampleBlocks: Step[] = sampleBlocks.map((block) => {
  if (block.type === "Branch") {
    return { ...block, executedAt: EXECUTED_AT, executedBranchIds: ["a1"] };
  }
  return EXECUTED_BLOCK_IDS.has(block.id) ? { ...block, executedAt: EXECUTED_AT } : block;
});

// ライブなゲームフラグは string 値 (evaluateCondition / DynamicValue が string 前提)。
export const sampleLiveFlags: Record<string, string> = { evidence: "見つけた", round: "1" };
