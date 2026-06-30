import z from "zod";

import type { ConditionNode } from "@/components/Node/utils/evaluateCondition";

import { conditionToInfix } from "@/components/Node/utils/evaluateCondition";

import type { FlowData, Step } from "./schema";

import { FlowDataSchema, StepSchema } from "./schema";

// reactFlowData (グラフ) → FlowData (ステップツリー) のベストエフォート変換器。
// 分岐は最近共通合流点 (immediate post-dominator) を検出して branches[].steps にネストし、
// 変換しきれない構造は捨てずにフラット化 + ⚠️ メモと警告で手直しを促す。

export type ConversionWarning = {
  message: string;
  nodeId?: string;
};

// Zod の検証失敗を「path: 理由」の短い要約にする。どのフィールドがなぜ落ちたか特定するため
function summarizeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.map((segment) => segment.toString()).join(".");
      return path === "" ? issue.message : `${path}: ${issue.message}`;
    })
    .join("; ");
}

// 検証前の生オブジェクトから文字列フィールドを best-effort で取り出す (warning メッセージ用)
function rawStringField(raw: unknown, key: string): string | undefined {
  if (raw !== null && typeof raw === "object" && key in raw) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

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
const DEFAULT_ARM_ID = "default";

// 仮想終端。合流点が無い (全枝が末端まで流れる) ことを表す
const EXIT = Symbol("exit");
type JoinPoint = string | typeof EXIT;

// ラベルが空の LabeledGroup 用。未分類 (グループ非所属) とは区別できる既定タイトル
const UNTITLED_GROUP_TITLE = "グループ (無題)";

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

// 1 つの条件枝を Branch の arm 候補へ変換する。条件式が読めない場合はラベルを
// 「条件N」へフォールバックしつつ、喪失内容を警告で surface する。
function toBranchArm(
  condition: { id: string; root: unknown },
  index: number,
  nodeId: string,
  warnings: ConversionWarning[],
): { id: string; label: string; condition: unknown; steps: never[] } {
  try {
    return {
      id: condition.id,
      label: conditionToInfix(condition.root as ConditionNode),
      condition: condition.root,
      steps: [],
    };
  } catch (error) {
    // error.name を残し、ZodError 以外の想定外例外型 (TypeError 等) を後から識別可能にする
    const errorName = error instanceof Error ? error.constructor.name : "UnknownError";
    const detail = error instanceof Error ? error.message : String(error);
    if (condition.root === undefined) {
      // condition root 欠落の枝は BranchArmSchema.condition が optional なため検証を通り、
      // 「条件なし = 無条件デフォルト(else)枝」に化ける。ラベルだけでなく意味論の変化を警告する
      warnings.push({
        nodeId,
        message: `分岐の条件${
          index + 1
        }を読み取れなかったため、この枝はデフォルト(無条件)枝になりました。手動で条件を再設定してください (${errorName}: ${detail})`,
      });
    } else {
      warnings.push({
        nodeId,
        message: `分岐の条件${index + 1}を読めなかったため「条件${
          index + 1
        }」と表示します (${errorName}: ${detail})`,
      });
    }
    return { id: condition.id, label: `条件${index + 1}`, condition: condition.root, steps: [] };
  }
}

type BranchArmCandidate = {
  id: string;
  label: string;
  condition?: unknown;
  steps: unknown[];
};

// ノード → ステップ候補 (parse 前の生データ)。分岐 2 種は統合 Branch 型へ再構成し、
// それ以外は data のフィールド名が新スキーマと同じためそのまま引き継ぐ。
function toStepCandidate(node: RFNode, warnings: ConversionWarning[]): Record<string, unknown> {
  if (node.type === "ConditionalBranch") {
    const data = ConditionalBranchDataSchema.parse(node.data);
    const branches: BranchArmCandidate[] = [
      ...data.conditions.map((condition, index) =>
        toBranchArm(condition, index, node.id, warnings),
      ),
      ...(data.hasDefaultBranch ? [{ id: DEFAULT_ARM_ID, label: "デフォルト", steps: [] }] : []),
    ];
    // 旧実装は「どの条件にもマッチせずデフォルト枝が実行された」とき空配列を記録する
    const executedBranchIds =
      data.evaluatedConditionIds === undefined
        ? undefined
        : data.evaluatedConditionIds.length === 0 && data.hasDefaultBranch
          ? [DEFAULT_ARM_ID]
          : data.evaluatedConditionIds;
    return {
      id: node.id,
      type: "Branch",
      title: titleOf(node),
      executedAt: node.data.executedAt,
      mode: "auto",
      matchMode: data.matchMode,
      branches,
      executedBranchIds,
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

type CandidateEntry = { node: RFNode; candidate: Record<string, unknown> };

// エッジ順 (Kahn 法) のトポロジカル順。循環で並べきれないノードは警告して座標順で末尾に足す
function topologicalOrder(
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

// 各ノードの最近共通合流点 (immediate post-dominator)。
// 後続が無いノードは EXIT。前提: order は (循環部を末尾に足した) トポロジカル順
function computePostDominators(
  order: RFNode[],
  outgoing: Map<string, RFEdge[]>,
): Map<string, JoinPoint> {
  const ipdom = new Map<string, JoinPoint>();
  const climb = (node: JoinPoint): JoinPoint => (node === EXIT ? EXIT : (ipdom.get(node) ?? EXIT));
  // ipdom チェーン上の最近共通祖先 (LCA)。循環ノード (末尾に足された循環部) では
  // ipdom が閉路を成しうるため、閉路を検知したら合流点なしの EXIT へ縮退する
  const intersect = (aIn: JoinPoint, bIn: JoinPoint): JoinPoint => {
    const ancestors = new Set<JoinPoint>();
    let a: JoinPoint = aIn;
    while (!ancestors.has(a)) {
      ancestors.add(a);
      if (a === EXIT) break;
      a = climb(a);
    }
    let b: JoinPoint = bIn;
    const seen = new Set<JoinPoint>();
    while (!ancestors.has(b)) {
      if (b === EXIT || seen.has(b)) return EXIT;
      seen.add(b);
      b = climb(b);
    }
    return b;
  };

  for (const node of [...order].reverse()) {
    const successors = [...new Set((outgoing.get(node.id) ?? []).map((edge) => edge.target))];
    let join: JoinPoint = EXIT;
    if (successors.length > 0) {
      join = successors[0];
      for (const successor of successors.slice(1)) {
        join = intersect(join, successor);
      }
    }
    ipdom.set(node.id, join);
  }
  return ipdom;
}

// グラフを再帰的に歩き、分岐は合流点までを branches[].steps にネストした候補ツリーを作る。
// topLevel はセクション割り当て対象、all はメモ吸収 (Comment) の対象
function buildStructure(
  stepNodes: RFNode[],
  edges: RFEdge[],
  warnings: ConversionWarning[],
): { topLevel: CandidateEntry[]; all: CandidateEntry[] } {
  const byId = new Map(stepNodes.map((node) => [node.id, node]));
  const stepEdges = edges.filter((edge) => byId.has(edge.source) && byId.has(edge.target));
  const outgoing = new Map<string, RFEdge[]>();
  const hasIncoming = new Set<string>();
  for (const edge of stepEdges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    hasIncoming.add(edge.target);
  }

  const order = topologicalOrder(stepNodes, stepEdges, warnings);
  const ipdom = computePostDominators(order, outgoing);

  const topLevel: CandidateEntry[] = [];
  const all: CandidateEntry[] = [];
  const consumed = new Set<string>();

  const makeEntry = (node: RFNode): CandidateEntry | null => {
    try {
      return { node, candidate: toStepCandidate(node, warnings) };
    } catch (error) {
      // ZodError はデータ不整合なので best-effort スキップ。それ以外 (TypeError 等の
      // プログラミングエラー) は握りつぶさず再 throw する
      if (!(error instanceof z.ZodError)) throw error;
      warnings.push({
        nodeId: node.id,
        message: `ノード「${titleOf(node)}」のデータを変換できなかったためスキップしました: ${summarizeIssues(error)}`,
      });
      return null;
    }
  };

  const walkChain = (
    startId: string | null,
    stops: ReadonlySet<string>,
    sink: CandidateEntry[],
  ) => {
    let cur = startId;
    while (cur !== null && !stops.has(cur)) {
      if (consumed.has(cur)) {
        warnings.push({
          nodeId: cur,
          message: "複雑な接続のため、一部の接続を辿りませんでした",
        });
        break;
      }
      const nodeId = cur;
      const node = byId.get(nodeId);
      if (!node) break;
      consumed.add(nodeId);

      const entry = makeEntry(node);
      if (entry && node.type === "ConditionalBranch") {
        sink.push(entry);
        all.push(entry);
        const join = buildBranch(entry, sink, stops);
        cur = join === EXIT ? null : join;
        continue;
      }
      if (entry) {
        // 最上位チェーンの不正ステップは Comment 吸収後にセクション組み立てで検証し、
        // 失われたメモを警告へ残す。枝の中など非最上位では即時に検証して捨て、不正な
        // 1 ステップが親分岐ごと巻き込んで落とされるのを防ぐ
        const validation = sink === topLevel ? null : StepSchema.safeParse(entry.candidate);
        if (validation === null || validation.success) {
          sink.push(entry);
          all.push(entry);
        } else {
          warnings.push({
            nodeId: node.id,
            message: `ノード「${titleOf(node)}」のデータが不正なためスキップしました: ${summarizeIssues(
              validation.error,
            )}`,
          });
        }
      }
      const targets = (outgoing.get(nodeId) ?? []).map((edge) => edge.target);
      if (targets.length > 1) {
        warnings.push({
          nodeId,
          message: `「${titleOf(node)}」に複数の接続があるため、最初の接続のみを辿りました`,
        });
      }
      cur = targets[0] ?? null;
    }
  };

  // 分岐の各枝を合流点までネストする。ハンドルが解釈できない構造は
  // フラット化 (親チェーンへ展開) + ⚠️ メモにフォールバックする
  const buildBranch = (
    entry: CandidateEntry,
    sink: CandidateEntry[],
    stops: ReadonlySet<string>,
  ): JoinPoint => {
    const node = entry.node;
    const branchEdges = outgoing.get(node.id) ?? [];
    const arms = entry.candidate.branches as BranchArmCandidate[];

    const edgesOf = (arm: BranchArmCandidate) => {
      const handle = arm.id === DEFAULT_ARM_ID ? "source-default" : `source-cond-${arm.id}`;
      return branchEdges.filter((edge) => edge.sourceHandle === handle);
    };

    // 未結線の枝は「そこで流れが終わる」ため、合流点は存在しない (EXIT) とみなす。
    // そうしないと唯一の後続が合流点扱いになり、枝の中身が分岐の外へ巻き上がってしまう
    const hasUnwiredArm = arms.some((arm) => edgesOf(arm).length === 0);
    const join: JoinPoint = hasUnwiredArm ? EXIT : (ipdom.get(node.id) ?? EXIT);
    const armStops = join === EXIT ? stops : new Set([...stops, join]);

    if (arms.some((arm) => edgesOf(arm).length > 1)) {
      entry.candidate.memo = appendMemo(
        (entry.candidate.memo as string | undefined) ?? "",
        "⚠️ 分岐の枝を自動ネスト化できなかったため、後続ステップをフラットに並べています。枝の内容を手動で移動してください。",
      );
      warnings.push({
        nodeId: node.id,
        message: `分岐「${titleOf(node)}」の後続をフラット化しました`,
      });
      for (const edge of branchEdges) {
        walkChain(edge.target, armStops, sink);
      }
      return join;
    }

    const knownEdges = new Set(arms.flatMap((arm) => edgesOf(arm)));
    for (const arm of arms) {
      const target = edgesOf(arm)[0]?.target ?? null;
      if (target === null || target === join) continue;
      const armSink: CandidateEntry[] = [];
      walkChain(target, armStops, armSink);
      arm.steps = armSink.map((armEntry) => armEntry.candidate);
    }

    const leftovers = branchEdges.filter((edge) => !knownEdges.has(edge));
    if (leftovers.length > 0) {
      warnings.push({
        nodeId: node.id,
        message: `分岐「${titleOf(node)}」に対応する枝が見つからない接続があるため、フラットに並べました`,
      });
      for (const edge of leftovers) {
        walkChain(edge.target, armStops, sink);
      }
    }
    return join;
  };

  const noStops: ReadonlySet<string> = new Set();
  const roots = stepNodes.filter((node) => !hasIncoming.has(node.id)).sort(byPosition);
  for (const root of roots) {
    walkChain(root.id, noStops, topLevel);
  }

  // 異常な構造 (循環・辿れなかった接続) で残ったノードの受け皿。データは捨てない
  let warnedLeftover = false;
  while (consumed.size < stepNodes.length) {
    const remaining = stepNodes.filter((node) => !consumed.has(node.id)).sort(byPosition);
    if (!warnedLeftover) {
      warnings.push({ message: "接続を辿れなかったステップを末尾に配置しました" });
      warnedLeftover = true;
    }
    walkChain(remaining[0].id, noStops, topLevel);
  }

  return { topLevel, all };
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
      warnings.push({
        nodeId: rawStringField(rawNode, "id"),
        message: `ノードを読み取れなかったためスキップしました: ${summarizeIssues(result.error)}`,
      });
    }
  }
  const edges: RFEdge[] = [];
  for (const rawEdge of parsed.edges) {
    const result = RFEdgeSchema.safeParse(rawEdge);
    if (result.success) {
      edges.push(result.data);
    } else {
      const source = rawStringField(rawEdge, "source");
      const target = rawStringField(rawEdge, "target");
      const endpoints =
        source !== undefined || target !== undefined
          ? ` (${source ?? "?"} → ${target ?? "?"})`
          : "";
      warnings.push({
        message: `エッジ${endpoints}を読み取れなかったためスキップしました: ${summarizeIssues(result.error)}`,
      });
    }
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

  const { topLevel, all } = buildStructure(stepNodes, edges, warnings);
  const groupKeyOf = (node: RFNode) => findContainingGroup(node, groups)?.id ?? UNGROUPED;

  // Comment の吸収: グループ内なら同グループ内の最近接ステップ、いなければセクション memo へ。
  // グループ外なら全ステップ中の最近接へ
  const sectionMemos = new Map<string | typeof UNGROUPED, string>();
  const addSectionMemo = (key: string | typeof UNGROUPED, text: string) => {
    sectionMemos.set(key, appendMemo(sectionMemos.get(key) ?? "", text));
  };
  for (const comment of comments) {
    const rawComment = comment.data.comment;
    // 値は存在するが非文字列 (数値/オブジェクト等) は黙って捨てず warning にする。
    // 欠落 (undefined) / null / 空文字は正規スキップとして無警告
    if (rawComment !== undefined && rawComment !== null && typeof rawComment !== "string") {
      warnings.push({
        nodeId: comment.id,
        message: "Comment の本文が文字列でないため取り込めませんでした",
      });
      continue;
    }
    const text = typeof rawComment === "string" ? rawComment : "";
    if (text === "") continue;
    const groupKey = groupKeyOf(comment);
    const scope =
      groupKey === UNGROUPED ? all : all.filter(({ node }) => groupKeyOf(node) === groupKey);
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
    // data は z.record(z.unknown()) で素通しのため、循環参照や BigInt 等で stringify が throw し得る。
    // 1 個の壊れた Blueprint で変換全体 (収集済み warnings ごと) をクラッシュさせないよう握る
    let parametersText: string;
    try {
      parametersText = JSON.stringify(blueprint.data.parameters ?? {});
    } catch (error) {
      parametersText = "(パラメータを文字列化できませんでした)";
      warnings.push({
        nodeId: blueprint.id,
        message: `Blueprint「${titleOf(blueprint)}」のパラメータを文字列化できませんでした: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
    addSectionMemo(
      groupKeyOf(blueprint),
      `⚠️ Blueprint「${titleOf(blueprint)}」はウィザードに移行されるためステップ化されませんでした。パラメータ: ${parametersText}`,
    );
    warnings.push({
      nodeId: blueprint.id,
      message: `Blueprint「${titleOf(blueprint)}」はステップ化されませんでした`,
    });
  }

  // 実行順を保ったまま、所属グループが切り替わるごとにセクションを区切る
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const sectionTitle = (group: RFNode | undefined) => {
    if (group === undefined) return UNGROUPED_TITLE;
    const label = group.data.label;
    return typeof label === "string" && label !== "" ? label : UNTITLED_GROUP_TITLE;
  };
  const sections: { id: string; title: string; memo: string; steps: Step[] }[] = [];
  const runCount = new Map<string | typeof UNGROUPED, number>();
  // セクション化されたグループ。ここに載らないグループはラベルが失われるため後で警告する
  const realizedGroupIds = new Set<string>();
  let currentKey: string | typeof UNGROUPED | null = null;
  for (const { node, candidate } of topLevel) {
    const stepResult = StepSchema.safeParse(candidate);
    if (!stepResult.success) {
      // 吸収済み Comment の memo はこのステップと共に失われるため、内容を warning に残す
      const lostMemo =
        typeof candidate.memo === "string" && candidate.memo !== "" ? candidate.memo : undefined;
      warnings.push({
        nodeId: node.id,
        message: `ノード「${titleOf(node)}」のデータが不正なためスキップしました: ${summarizeIssues(
          stepResult.error,
        )}${lostMemo === undefined ? "" : ` (失われたメモ: ${lostMemo})`}`,
      });
      continue;
    }
    const key = groupKeyOf(node);
    if (key !== UNGROUPED) realizedGroupIds.add(key);
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
    if (key !== UNGROUPED) realizedGroupIds.add(key);
    const baseId = key === UNGROUPED ? "ungrouped" : key;
    let section = sections.find((candidate) => candidate.id === String(baseId));
    if (!section) {
      const group = key === UNGROUPED ? undefined : groupById.get(key);
      section = { id: String(baseId), title: sectionTitle(group), memo: "", steps: [] };
      sections.push(section);
    }
    section.memo = appendMemo(section.memo, memo);
  }

  // 直接の所属ノードを持たないグループ (例: ネストの外側グループや空グループ) はセクション化
  // されずラベルが失われる。他のスキップは全て警告される方針に合わせ、ここも warning を残す
  for (const group of groups) {
    if (realizedGroupIds.has(group.id)) continue;
    const label = group.data.label;
    const labelText = typeof label === "string" && label !== "" ? `「${label}」` : "(無題)";
    warnings.push({
      nodeId: group.id,
      message: `グループ${labelText}は所属するノードが無いためセクション化されず、ラベルが失われました`,
    });
  }

  return { flowData: FlowDataSchema.parse({ version: 1, sections }), warnings };
}
