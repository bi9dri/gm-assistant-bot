// Phase 3 実行エンジンの契約 (docs: step-list-editor-architecture "Execution engine")。
// 各ステップタイプの execute() は「pure-ish」: step + context を受け取り
// Validate → Resolve → Call → Persist を行い ExecuteResult を返す。Discord 呼び出しと
// db 書き込みは context のポート越しに行うため、context をモックすれば execute() を
// レンダリング無しで unit-test できる。

// セッション中に生成された Discord リソースのスナップショット。
// db.Role / db.Channel / db.Category (sessionId スコープ) に対応する。
export interface SessionRole {
  id: string;
  name: string;
}

export interface SessionChannel {
  id: string;
  name: string;
  type: "text" | "voice";
  writerRoleIds: string[];
  readerRoleIds: string[];
}

export interface SessionCategory {
  id: string;
  name: string;
}

interface OutgoingAttachment {
  filePath: string;
  fileName: string;
}

interface OutgoingMessage {
  channelId: string;
  content: string;
  attachments: OutgoingAttachment[];
}

// Discord 呼び出し層 (旧 ApiClient のラッパ)。guildId は本番実装に閉じ込め、execute() は
// 意味的な操作だけを呼ぶ。sendMessage は添付を filePath で受け取り、本番実装が OPFS から
// 読むため execute() 自身は FileSystem に触れない (純粋性を保つ)。
export interface DiscordGateway {
  createRole(name: string): Promise<{ id: string; name: string }>;
  deleteRole(roleId: string): Promise<void>;
  createCategory(name: string): Promise<{ id: string; name: string }>;
  createChannel(params: {
    parentCategoryId: string;
    name: string;
    type: "text" | "voice";
    writerRoleIds: string[];
    readerRoleIds: string[];
  }): Promise<{ id: string; name: string }>;
  changeChannelPermissions(params: {
    channelId: string;
    writerRoleIds: string[];
    readerRoleIds: string[];
  }): Promise<void>;
  deleteChannel(channelId: string): Promise<void>;
  addRoleToRoleMembers(params: { memberRoleId: string; addRoleId: string }): Promise<void>;
  sendMessage(message: OutgoingMessage): Promise<void>;
}

// セッションリソースの読み取り (スナップショット) と永続化ミューテーション。
// 本番実装は db を back に持ち、execute() は名前→id 解決とリソース記録に使う。
export interface ResourceStore {
  readonly roles: SessionRole[];
  readonly channels: SessionChannel[];
  readonly categories: SessionCategory[];
  addRole(role: SessionRole): Promise<void>;
  removeRole(roleId: string): Promise<void>;
  addCategory(category: SessionCategory): Promise<void>;
  removeCategory(categoryId: string): Promise<void>;
  addChannel(channel: SessionChannel): Promise<void>;
  removeChannel(channelId: string): Promise<void>;
  updateChannel(
    channelId: string,
    patch: Partial<Pick<SessionChannel, "writerRoleIds" | "readerRoleIds">>,
  ): Promise<void>;
}

// ライブなセッションゲームフラグ (D3: execute モードでは GameSession.gameFlags)。
// 値は string (evaluateCondition / DynamicValue が string を前提)。
interface FlagStore {
  get(): Record<string, string>;
  set(patch: Record<string, string>): Promise<void>;
}

export interface ExecuteContext {
  guildId: string;
  sessionId: number;
  sessionName: string;
  discord: DiscordGateway;
  resources: ResourceStore;
  flags: FlagStore;
  // Branch select モードで GM が選んだ枝 (arm) id。auto モードでは無視される。
  branchChoice?: string;
}

// execute() の結果。status が "success" のときだけ engine は executedAt を刻む。
// branchArmIds は Branch のみ: engine が descend する枝 (arm) id と executedBranchIds。
export interface ExecuteResult {
  status: "success" | "error";
  message: string;
  branchArmIds?: string[];
}
