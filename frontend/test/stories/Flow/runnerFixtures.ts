import type { FlowData } from "@/flow/schema";

// execute モード (runner) の VRT 用フィクスチャ。実行済み (executedAt)・スキップ・cursor・
// 分岐の確定 (executedBranchIds) が 1 つに揃うようにしてある。決定性のため id は固定、
// executedAt は固定日時 (表示はバッジのみで日時は出さないため値は不問)。
const EXECUTED_AT = new Date("2026-01-01T00:00:00.000Z");

export const runnerFlow: FlowData = {
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
          executedAt: EXECUTED_AT,
          roles: ["市民", "人狼"],
        },
        {
          id: "cc",
          type: "CreateChannel",
          title: "チャンネル作成",
          memo: "",
          autoAdvance: false,
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
          executedAt: EXECUTED_AT,
          mode: "select",
          matchMode: "first",
          flagName: "vote",
          executedBranchIds: ["a1"],
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

export const runnerGameFlags: Record<string, string> = {
  phase: "day",
  vote: "処刑する",
  executed: "2",
};

// runner UI stories 共通の no-op ハンドラ (VRT は静的描画のみ)。
export const noopHandlers = {
  onRun: () => {},
  onSkip: () => {},
};
