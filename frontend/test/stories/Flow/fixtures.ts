import type { FlowData } from "@/flow/schema";

// 各カテゴリ (操作 / 分岐 / ツール)・分岐ネスト・折りたたみセクションを 1 つに含む
// step-list editor 用のサンプル。VRT stories の共通シード。
export const sampleFlow: FlowData = {
  version: 1,
  sections: [
    {
      id: "setup",
      title: "セットアップ",
      memo: "",
      collapsed: false,
      steps: [
        {
          id: "cr",
          type: "CreateRole",
          title: "ロール作成",
          memo: "",
          autoAdvance: true,
          roles: ["市民", "人狼"],
        },
        {
          id: "cc",
          type: "CreateChannel",
          title: "チャンネル作成",
          memo: "",
          autoAdvance: true,
          channels: [{ name: "全体", type: "text", rolePermissions: [] }],
        },
        {
          id: "sf",
          type: "SetGameFlag",
          title: "フェーズ初期化",
          memo: "昼から開始",
          autoAdvance: false,
          flagKey: "phase",
          flagValue: "day",
          flagKeyOptions: [],
          flagValueOptions: [],
        },
      ],
    },
    {
      id: "main",
      title: "本編",
      memo: "",
      collapsed: false,
      steps: [
        {
          id: "sm",
          type: "SendMessage",
          title: "開始メッセージ",
          memo: "",
          autoAdvance: false,
          channelTargets: [{ type: "channelName", value: "全体" }],
          messages: [{ content: "ゲームを開始します", attachments: [] }],
        },
        {
          id: "br",
          type: "Branch",
          title: "投票分岐",
          memo: "",
          autoAdvance: false,
          mode: "select",
          matchMode: "first",
          flagName: "vote",
          branches: [
            {
              id: "a1",
              label: "処刑する",
              steps: [
                {
                  id: "ct",
                  type: "Counter",
                  title: "処刑数カウント",
                  memo: "",
                  autoAdvance: false,
                  flagKey: "executed",
                  step: 1,
                },
              ],
            },
            { id: "a2", label: "処刑しない", steps: [] },
          ],
        },
      ],
    },
    {
      id: "tools",
      title: "ツール (折りたたみ)",
      memo: "",
      collapsed: true,
      steps: [
        {
          id: "kb",
          type: "Kanban",
          title: "盤面",
          memo: "",
          autoAdvance: false,
          columns: [],
          cards: [],
          initialPlacements: [],
          cardPlacements: [],
        },
      ],
    },
  ],
};

export const sampleGameFlags: Record<string, unknown> = {
  phase: "day",
  round: "3",
  executed: "0",
};
