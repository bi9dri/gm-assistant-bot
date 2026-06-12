import z from "zod";

import type { ConditionNode } from "@/components/Node/utils/evaluateCondition";

import { conditionToInfix } from "@/components/Node/utils/evaluateCondition";

import type { FlowData, Step } from "./schema";

import { FlowDataSchema, StepSchema } from "./schema";

// reactFlowData (グラフ) → FlowData (ステップツリー) のベストエフォート変換器。
// 変換しきれない構造は捨てずにフラット化し、⚠️ メモと警告で手直しを促す。

type ConversionWarning = {
  message: string;
  nodeId?: string;
};

const RFNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).default({}),
  width: z.number().optional(),
  height: z.number().optional(),
  measured: z
    .object({ width: z.number().optional(), height: z.number().optional() })
    .partial()
    .optional(),
  style: z
    .object({ width: z.number().optional(), height: z.number().optional() })
    .partial()
    .optional(),
});
type RFNode = z.infer<typeof RFNodeSchema>;

const RFEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullish(),
});
type RFEdge = z.infer<typeof RFEdgeSchema>;

const ConvertInputSchema = z.object({
  nodes: z.array(z.unknown()).default([]),
  edges: z.array(z.unknown()).default([]),
});

// 旧グラフでステップへ変換する対象 (LabeledGroup / Comment / Blueprint を除く全ノード型)
const STEP_NODE_TYPES = new Set([
  "CreateRole",
  "DeleteRole",
  "CreateCategory",
  "DeleteCategory",
  "CreateChannel",
  "DeleteChannel",
  "ChangeChannelPermission",
  "AddRoleToRoleMembers",
  "SendMessage",
  "CombinationSendMessage",
  "SetGameFlag",
  "Kanban",
  "Counter",
  "ShuffleAssign",
  "RandomSelect",
  "RecordCombination",
  "ConditionalBranch",
  "SelectBranch",
]);

const UNGROUPED = Symbol("ungrouped");
const UNGROUPED_TITLE = "未分類";

const sizeOf = (node: RFNode) => ({
  width: node.measured?.width ?? node.width ?? node.style?.width ?? 0,
  height: node.measured?.height ?? node.height ?? node.style?.height ?? 0,
});

const centerOf = (node: RFNode) => {
  const { width, height } = sizeOf(node);
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
};

const distance = (a: RFNode, b: RFNode) => {
  const ca = centerOf(a);
  const cb = centerOf(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
};

const byPosition = (a: RFNode, b: RFNode) =>
  a.position.y - b.position.y || a.position.x - b.position.x;

const appendMemo = (memo: string, text: string) => (memo === "" ? text : `${memo}\n\n${text}`);

// 内包判定はノードの中心点で行い、ネストしたグループは面積最小 (最内) を採用する
function findContainingGroup(node: RFNode, groups: RFNode[]): RFNode | undefined {
  const center = centerOf(node);
  let innermost: RFNode | undefined;
  let innermostArea = Number.POSITIVE_INFINITY;
  for (const group of groups) {
    if (group.id === node.id) continue;
    const { width, height } = sizeOf(group);
    const contains =
      center.x >= group.position.x &&
      center.x <= group.position.x + width &&
      center.y >= group.position.y &&
      center.y <= group.position.y + height;
    if (contains && width * height < innermostArea) {
      innermost = group;
      innermostArea = width * height;
    }
  }
  return innermost;
}

// エッジを尊重したトポロジカル順 (Kahn 法)。同時に実行可能なノードは座標 (y, x) 順。
// 循環で残ったノードは座標順で末尾に足し、警告を返す。
function orderStepNodes(
  stepNodes: RFNode[],
  edges: RFEdge[],
  warnings: ConversionWarning[],
): RFNode[] {
  const byId = new Map(stepNodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  const inDegree = new Map<string, number>(stepNodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const ready = stepNodes.filter((node) => inDegree.get(node.id) === 0).sort(byPosition);
  const ordered: RFNode[] = [];
  while (ready.length > 0) {
    const node = ready.shift() as RFNode;
    ordered.push(node);
    const becameReady: RFNode[] = [];
    for (const targetId of outgoing.get(node.id) ?? []) {
      const remaining = (inDegree.get(targetId) ?? 0) - 1;
      inDegree.set(targetId, remaining);
      if (remaining === 0) becameReady.push(byId.get(targetId) as RFNode);
    }
    // 直後に実行可能になったノードを優先しつつ、複数あれば座標順で先頭に挿入する
    ready.unshift(...becameReady.sort(byPosition));
  }

  if (ordered.length < stepNodes.length) {
    const leftover = stepNodes.filter((node) => !ordered.includes(node)).sort(byPosition);
    warnings.push({
      message: `循環した接続があるため ${leftover.length} 個のノードを末尾に配置しました`,
    });
    ordered.push(...leftover);
  }
  return ordered;
}

function titleOf(node: RFNode): string {
  const title = node.data.title;
  return typeof title === "string" && title !== "" ? title : node.type;
}

const ConditionalBranchDataSchema = z.object({
  conditions: z.array(z.object({ id: z.string(), root: z.unknown() })),
  hasDefaultBranch: z.boolean().default(true),
  matchMode: z.enum(["first", "all"]).default("first"),
  evaluatedConditionIds: z.array(z.string()).optional(),
});

const SelectBranchDataSchema = z.object({
  options: z.array(z.object({ id: z.string(), label: z.string() })),
  flagName: z.string().default(""),
  selectedValue: z.string().optional(),
});

function armLabel(root: unknown, index: number): string {
  try {
    return conditionToInfix(root as ConditionNode);
  } catch {
    return `条件${index + 1}`;
  }
}

// ノード → ステップ候補 (parse 前の生データ)。分岐 2 種は統合 Branch 型へ再構成し、
// それ以外は data のフィールド名が新スキーマと同じためそのまま引き継ぐ。
function toStepCandidate(node: RFNode): Record<string, unknown> {
  if (node.type === "ConditionalBranch") {
    const data = ConditionalBranchDataSchema.parse(node.data);
    return {
      id: node.id,
      type: "Branch",
      title: titleOf(node),
      executedAt: node.data.executedAt,
      mode: "auto",
      matchMode: data.matchMode,
      branches: [
        ...data.conditions.map((condition, index) => ({
          id: condition.id,
          label: armLabel(condition.root, index),
          condition: condition.root,
          steps: [],
        })),
        ...(data.hasDefaultBranch ? [{ id: "default", label: "デフォルト", steps: [] }] : []),
      ],
      executedBranchIds: data.evaluatedConditionIds,
    };
  }
  if (node.type === "SelectBranch") {
    const data = SelectBranchDataSchema.parse(node.data);
    const selectedId = data.options.find((option) => option.label === data.selectedValue)?.id;
    return {
      id: node.id,
      type: "Branch",
      title: titleOf(node),
      executedAt: node.data.executedAt,
      mode: "select",
      flagName: data.flagName,
      branches: data.options.map((option) => ({ id: option.id, label: option.label, steps: [] })),
      executedBranchIds: selectedId === undefined ? undefined : [selectedId],
    };
  }
  return { ...node.data, id: node.id, type: node.type, title: titleOf(node) };
}

export function convertReactFlowToFlowData(input: unknown): {
  flowData: FlowData;
  warnings: ConversionWarning[];
} {
  const warnings: ConversionWarning[] = [];
  const parsed = ConvertInputSchema.parse(input);

  const nodes: RFNode[] = [];
  for (const rawNode of parsed.nodes) {
    const result = RFNodeSchema.safeParse(rawNode);
    if (result.success) {
      nodes.push(result.data);
    } else {
      warnings.push({ message: "ノードを読み取れなかったためスキップしました" });
    }
  }
  const edges: RFEdge[] = [];
  for (const rawEdge of parsed.edges) {
    const result = RFEdgeSchema.safeParse(rawEdge);
    if (result.success) edges.push(result.data);
  }

  const groups = nodes.filter((node) => node.type === "LabeledGroup");
  const comments = nodes.filter((node) => node.type === "Comment").sort(byPosition);
  const blueprints = nodes.filter((node) => node.type === "Blueprint");
  const stepNodes = nodes.filter((node) => STEP_NODE_TYPES.has(node.type));
  for (const node of nodes) {
    if (
      node.type !== "LabeledGroup" &&
      node.type !== "Comment" &&
      node.type !== "Blueprint" &&
      !STEP_NODE_TYPES.has(node.type)
    ) {
      warnings.push({ nodeId: node.id, message: `未知のノード型 ${node.type} をスキップしました` });
    }
  }

  const ordered = orderStepNodes(stepNodes, edges, warnings);
  const groupKeyOf = (node: RFNode) => findContainingGroup(node, groups)?.id ?? UNGROUPED;

  // ステップ候補を組み立て、検証に失敗したものは捨てて警告にする
  const candidates: { node: RFNode; candidate: Record<string, unknown> }[] = [];
  for (const node of ordered) {
    try {
      candidates.push({ node, candidate: toStepCandidate(node) });
    } catch {
      warnings.push({
        nodeId: node.id,
        message: `ノード「${titleOf(node)}」のデータを変換できなかったためスキップしました`,
      });
    }
  }

  // ConditionalBranch の後続はネスト化せずフラットに並ぶ (合流点検出は後続 PR)
  const outgoingCount = new Map<string, number>();
  for (const edge of edges) {
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
  }
  for (const { node, candidate } of candidates) {
    if (node.type === "ConditionalBranch" && (outgoingCount.get(node.id) ?? 0) > 0) {
      candidate.memo = appendMemo(
        (candidate.memo as string | undefined) ?? "",
        "⚠️ 分岐の枝を自動ネスト化できなかったため、後続ステップをフラットに並べています。枝の内容を手動で移動してください。",
      );
      warnings.push({
        nodeId: node.id,
        message: `分岐「${titleOf(node)}」の後続をフラット化しました`,
      });
    }
  }

  // Comment の吸収: グループ内なら同グループ内の最近接ステップ、いなければセクション memo へ。
  // グループ外なら全ステップ中の最近接へ
  const sectionMemos = new Map<string | typeof UNGROUPED, string>();
  const addSectionMemo = (key: string | typeof UNGROUPED, text: string) => {
    sectionMemos.set(key, appendMemo(sectionMemos.get(key) ?? "", text));
  };
  for (const comment of comments) {
    const text = typeof comment.data.comment === "string" ? comment.data.comment : "";
    if (text === "") continue;
    const groupKey = groupKeyOf(comment);
    const scope =
      groupKey === UNGROUPED
        ? candidates
        : candidates.filter(({ node }) => groupKeyOf(node) === groupKey);
    const nearest = [...scope].sort(
      (a, b) => distance(a.node, comment) - distance(b.node, comment),
    )[0];
    if (nearest) {
      nearest.candidate.memo = appendMemo(
        (nearest.candidate.memo as string | undefined) ?? "",
        text,
      );
    } else {
      addSectionMemo(groupKey, text);
    }
  }

  // Blueprint はウィザード (Phase 4) に移行するためステップ化せず、所属セクションの memo に残す
  for (const blueprint of blueprints) {
    addSectionMemo(
      groupKeyOf(blueprint),
      `⚠️ Blueprint「${titleOf(blueprint)}」はウィザードに移行されるためステップ化されませんでした。パラメータ: ${JSON.stringify(blueprint.data.parameters ?? {})}`,
    );
    warnings.push({
      nodeId: blueprint.id,
      message: `Blueprint「${titleOf(blueprint)}」はステップ化されませんでした`,
    });
  }

  // 実行順を保ったまま、所属グループが切り替わるごとにセクションを区切る
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const sectionTitle = (group: RFNode | undefined) => {
    const label = group?.data.label;
    return typeof label === "string" && label !== "" ? label : UNGROUPED_TITLE;
  };
  const sections: { id: string; title: string; memo: string; steps: Step[] }[] = [];
  const runCount = new Map<string | typeof UNGROUPED, number>();
  let currentKey: string | typeof UNGROUPED | null = null;
  for (const { node, candidate } of candidates) {
    const stepResult = StepSchema.safeParse(candidate);
    if (!stepResult.success) {
      warnings.push({
        nodeId: node.id,
        message: `ノード「${titleOf(node)}」のデータが不正なためスキップしました`,
      });
      continue;
    }
    const key = groupKeyOf(node);
    if (key !== currentKey || sections.length === 0) {
      currentKey = key;
      const run = (runCount.get(key) ?? 0) + 1;
      runCount.set(key, run);
      const group = key === UNGROUPED ? undefined : groupById.get(key);
      const baseId = key === UNGROUPED ? "ungrouped" : key;
      sections.push({
        id: run === 1 ? String(baseId) : `${String(baseId)}-${run}`,
        title: sectionTitle(group),
        memo: "",
        steps: [],
      });
    }
    sections.at(-1)?.steps.push(stepResult.data);
  }

  for (const [key, run] of runCount) {
    if (run > 1 && key !== UNGROUPED) {
      warnings.push({
        nodeId: key,
        message: "グループ内のステップが実行順で分断されているため、セクションを分割しました",
      });
    }
  }

  // セクション宛 memo (グループ内 Comment / Blueprint) を反映。該当セクションが無ければ作る
  for (const [key, memo] of sectionMemos) {
    const baseId = key === UNGROUPED ? "ungrouped" : key;
    let section = sections.find((candidate) => candidate.id === String(baseId));
    if (!section) {
      const group = key === UNGROUPED ? undefined : groupById.get(key);
      section = { id: String(baseId), title: sectionTitle(group), memo: "", steps: [] };
      sections.push(section);
    }
    section.memo = appendMemo(section.memo, memo);
  }

  return { flowData: FlowDataSchema.parse({ version: 1, sections }), warnings };
}
