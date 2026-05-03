/**
 * VRT 用の固定 seed payload。Date は固定値、id も固定値。
 * playwright fixture から page.evaluate 経由で Dexie に bulkAdd される。
 *
 * 制約:
 * - Date は ISO 文字列で渡し、ブラウザ側で `new Date()` 復元する。Playwright の
 *   page.evaluate 第二引数は構造化複製対象なので Date も渡せるが、JSON シリアライズ
 *   経路で安定させるため意図的に文字列に統一。
 * - reactFlowData / gameFlags は JSON 文字列(Dexie schema が string)。
 */

const FIXED_REACT_FLOW_DATA = JSON.stringify({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

const FIXED_GAME_FLAGS = "{}";

interface SeedTemplate {
  id: number;
  name: string;
  gameFlags: string;
  reactFlowData: string;
  createdAtIso: string;
  updatedAtIso: string;
}

interface SeedSession {
  id: number;
  name: string;
  guildId: string;
  botId: string;
  gameFlags: string;
  reactFlowData: string;
  createdAtIso: string;
  lastUsedAtIso: string;
}

interface SeedBot {
  id: string;
  name: string;
  token: string;
  icon: string;
}

interface SeedGuild {
  id: string;
  name: string;
  icon: string;
}

export interface SeedPayload {
  templates?: SeedTemplate[];
  sessions?: SeedSession[];
  bots?: SeedBot[];
  guilds?: SeedGuild[];
}

export const FIXTURE_TEMPLATES: SeedTemplate[] = [
  {
    id: 101,
    name: "サンプルテンプレートA",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: FIXED_REACT_FLOW_DATA,
    createdAtIso: "2026-01-10T10:00:00.000+09:00",
    updatedAtIso: "2026-01-15T15:30:00.000+09:00",
  },
  {
    id: 102,
    name: "サンプルテンプレートB",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: FIXED_REACT_FLOW_DATA,
    createdAtIso: "2026-01-12T11:00:00.000+09:00",
    updatedAtIso: "2026-01-20T09:00:00.000+09:00",
  },
];

export const FIXTURE_SESSIONS: SeedSession[] = [
  {
    id: 201,
    name: "サンプルセッションA",
    guildId: "vrt-guild-001",
    botId: "vrt-bot-001",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: FIXED_REACT_FLOW_DATA,
    createdAtIso: "2026-01-18T10:00:00.000+09:00",
    lastUsedAtIso: "2026-01-22T18:00:00.000+09:00",
  },
  {
    id: 202,
    name: "サンプルセッションB",
    guildId: "vrt-guild-001",
    botId: "vrt-bot-001",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: FIXED_REACT_FLOW_DATA,
    createdAtIso: "2026-01-19T11:00:00.000+09:00",
    lastUsedAtIso: "2026-01-25T20:00:00.000+09:00",
  },
];

export const FIXTURE_BOTS: SeedBot[] = [
  {
    id: "vrt-bot-001",
    name: "VRT Bot",
    token: "vrt-bot-token-001",
    icon: "https://cdn.discordapp.com/embed/avatars/0.png",
  },
];

export const FIXTURE_GUILDS: SeedGuild[] = [
  {
    id: "vrt-guild-001",
    name: "VRT Guild Alpha",
    icon: "https://cdn.discordapp.com/embed/avatars/1.png",
  },
];

// VRT 用の Template editor (React Flow) ノード fixture。
// viewport は {x:0, y:0, zoom:1} に固定して fitView を不要にし、
// snapshot を決定的にする。
const editorReactFlowData = (input: { nodes: unknown[]; edges: unknown[] }): string =>
  JSON.stringify({
    nodes: input.nodes,
    edges: input.edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  });

const SINGLE_CREATE_ROLE_NODE = {
  id: "CreateRole-1",
  type: "CreateRole",
  position: { x: 80, y: 60 },
  data: { roles: ["GM", "プレイヤー"] },
};

const SINGLE_SEND_MESSAGE_NODE = {
  id: "SendMessage-1",
  type: "SendMessage",
  position: { x: 80, y: 60 },
  data: {
    messages: [{ content: "事件発生のお知らせ", attachments: [] }],
    channelTargets: [{ type: "channelName", value: "general" }],
  },
};

const SINGLE_CONDITIONAL_BRANCH_NODE = {
  id: "ConditionalBranch-1",
  type: "ConditionalBranch",
  position: { x: 80, y: 60 },
  data: {
    conditions: [
      {
        id: "cond-1",
        root: {
          type: "rule",
          id: "rule-1",
          flagKey: "team",
          operator: "equals",
          value: "red",
          valueType: "literal",
        },
      },
    ],
  },
};

const CONNECTED_FLOW_NODES = [
  {
    id: "CreateRole-1",
    type: "CreateRole",
    position: { x: 60, y: 80 },
    data: { roles: ["GM", "プレイヤー"] },
  },
  {
    id: "SendMessage-1",
    type: "SendMessage",
    position: { x: 380, y: 80 },
    data: {
      messages: [{ content: "事件発生のお知らせ", attachments: [] }],
      channelTargets: [{ type: "channelName", value: "general" }],
    },
  },
  {
    id: "ConditionalBranch-1",
    type: "ConditionalBranch",
    position: { x: 60, y: 380 },
    data: {
      conditions: [
        {
          id: "cond-1",
          root: {
            type: "rule",
            id: "rule-1",
            flagKey: "team",
            operator: "equals",
            value: "red",
            valueType: "literal",
          },
        },
      ],
    },
  },
  {
    id: "Comment-1",
    type: "Comment",
    position: { x: 600, y: 480 },
    width: 256,
    height: 120,
    data: { comment: "シナリオの導入フェーズ" },
  },
];

const CONNECTED_FLOW_EDGES = [
  {
    id: "edge-cr-sm",
    source: "CreateRole-1",
    sourceHandle: "source-1",
    target: "SendMessage-1",
    targetHandle: "target-1",
  },
  {
    id: "edge-sm-cb",
    source: "SendMessage-1",
    sourceHandle: "source-1",
    target: "ConditionalBranch-1",
    targetHandle: "target-1",
  },
];

export const FIXTURE_EDITOR_TEMPLATES: SeedTemplate[] = [
  {
    id: 103,
    name: "VRT 単独 CreateRole",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: editorReactFlowData({ nodes: [SINGLE_CREATE_ROLE_NODE], edges: [] }),
    createdAtIso: "2026-01-10T10:00:00.000+09:00",
    updatedAtIso: "2026-01-15T15:30:00.000+09:00",
  },
  {
    id: 104,
    name: "VRT 単独 SendMessage",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: editorReactFlowData({ nodes: [SINGLE_SEND_MESSAGE_NODE], edges: [] }),
    createdAtIso: "2026-01-10T10:00:00.000+09:00",
    updatedAtIso: "2026-01-15T15:30:00.000+09:00",
  },
  {
    id: 105,
    name: "VRT 単独 ConditionalBranch",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: editorReactFlowData({
      nodes: [SINGLE_CONDITIONAL_BRANCH_NODE],
      edges: [],
    }),
    createdAtIso: "2026-01-10T10:00:00.000+09:00",
    updatedAtIso: "2026-01-15T15:30:00.000+09:00",
  },
  {
    id: 106,
    name: "VRT 接続フロー",
    gameFlags: FIXED_GAME_FLAGS,
    reactFlowData: editorReactFlowData({
      nodes: CONNECTED_FLOW_NODES,
      edges: CONNECTED_FLOW_EDGES,
    }),
    createdAtIso: "2026-01-10T10:00:00.000+09:00",
    updatedAtIso: "2026-01-15T15:30:00.000+09:00",
  },
];
