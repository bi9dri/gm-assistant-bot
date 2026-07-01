import { useMemo, useState } from "react";

import type { FlowData } from "../schema";

import { getEntry } from "../registry";
import { CATEGORY_CLASS, CATEGORY_LABEL } from "../registry/category";
import {
  defaultWizardParams,
  generateWizardFlow,
  MAX_VOICE_CHANNEL_COUNT,
  MIN_VOICE_CHANNEL_COUNT,
  type WizardParams,
} from "./generateFlow";

// 新規テンプレートウィザード (旧 Blueprint ノードの置き換え)。
// キャラクター名 / VC 数 / カテゴリ名 / 共通チャンネルを入力し、生成される
// セクション + ステップをプレビューしてからテンプレートを作成する。
// 生成ロジックは純粋な generateWizardFlow に委譲し、本コンポーネントは入力とプレビューのみ。

interface TemplateWizardProps {
  // 入力から生成した FlowData を受け取ってテンプレートを作成する (route が Dexie 保存を担う)。
  onCreate: (name: string, flowData: FlowData) => void;
  // 作成処理中は二重送信を防ぐためボタンを無効化する。
  creating?: boolean;
  // 初期パラメータ (プレビュー付きの初期状態を出したい VRT / 再利用向け)。
  initialParams?: WizardParams;
}

// 文字列配列を編集する小さなリストエディタ (キャラクター名 / 共通チャンネル)。
const StringListField = ({
  label,
  placeholder,
  addLabel,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  addLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
}) => (
  <div className="flex flex-col gap-2">
    <span className="text-sm font-semibold">{label}</span>
    {values.map((value, index) => (
      // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素の文字列配列
      <div key={`item-${index}`} className="flex items-center gap-2">
        <input
          type="text"
          className="input input-bordered input-sm flex-1"
          value={value}
          placeholder={placeholder}
          onChange={(evt) => onChange(values.map((v, i) => (i === index ? evt.target.value : v)))}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-label={`${label}の${index + 1}番目を削除`}
          onClick={() => onChange(values.filter((_, i) => i !== index))}
        >
          ×
        </button>
      </div>
    ))}
    <button
      type="button"
      className="btn btn-ghost btn-sm self-start"
      onClick={() => onChange([...values, ""])}
    >
      ＋ {addLabel}
    </button>
  </div>
);

export const TemplateWizard = ({
  onCreate,
  creating = false,
  initialParams = defaultWizardParams,
}: TemplateWizardProps) => {
  const [name, setName] = useState("");
  const [params, setParams] = useState<WizardParams>(initialParams);

  const update = <K extends keyof WizardParams>(key: K, value: WizardParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  // 入力から生成されるフローのプレビュー。id は毎回変わるが表示には現れないため VRT は安定。
  const preview = useMemo(() => generateWizardFlow(params), [params]);

  const canCreate = name.trim() !== "" && !creating;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate(name.trim(), generateWizardFlow(params));
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)] divide-x divide-base-300">
      {/* 入力カラム */}
      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">テンプレート名</span>
          <input
            type="text"
            className="input input-bordered"
            value={name}
            placeholder="テンプレート名を入力"
            onChange={(evt) => setName(evt.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">カテゴリ名</span>
          <input
            type="text"
            className="input input-bordered input-sm"
            value={params.categoryName}
            placeholder="セッション"
            onChange={(evt) => update("categoryName", evt.target.value)}
          />
          <span className="text-xs text-base-content/60">
            PL / 観戦ロールの接頭辞になります (空欄なら「PL」「観戦」)
          </span>
        </label>

        <StringListField
          label="キャラクター名"
          placeholder="キャラクター名"
          addLabel="キャラクターを追加"
          values={params.characterNames}
          onChange={(values) => update("characterNames", values)}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">ボイスチャンネル数</span>
          <input
            type="number"
            className="input input-bordered input-sm w-24"
            min={MIN_VOICE_CHANNEL_COUNT}
            max={MAX_VOICE_CHANNEL_COUNT}
            value={params.voiceChannelCount}
            onChange={(evt) => {
              // 空欄や不正入力で NaN が state に載ると preview が黙って 0 本になるため 0 に丸める。
              const parsed = Number(evt.target.value);
              update("voiceChannelCount", Number.isFinite(parsed) ? parsed : 0);
            }}
          />
        </label>

        <StringListField
          label="共通テキストチャンネル"
          placeholder="チャンネル名"
          addLabel="チャンネルを追加"
          values={params.sharedTextChannels}
          onChange={(values) => update("sharedTextChannels", values)}
        />

        <button
          type="button"
          className="btn btn-primary"
          disabled={!canCreate}
          onClick={handleCreate}
        >
          このテンプレートを作成
        </button>
      </div>

      {/* プレビューカラム */}
      <div className="flex flex-col gap-4 overflow-y-auto bg-base-200/40 p-4">
        <span className="text-sm font-semibold">生成されるステップ</span>
        {preview.sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-base-content/70">{section.title}</span>
            <ul className="flex flex-col gap-1">
              {section.steps.map((step) => {
                const entry = getEntry(step.type);
                return (
                  <li
                    key={step.id}
                    className="flex items-center gap-2 rounded bg-base-100 px-2 py-1"
                  >
                    {entry !== undefined && (
                      <span className={`badge badge-sm shrink-0 ${CATEGORY_CLASS[entry.category]}`}>
                        {CATEGORY_LABEL[entry.category]}
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm">
                      {entry !== undefined ? entry.summary(step) : step.type}
                    </span>
                    {step.autoAdvance && (
                      <span
                        className="badge badge-ghost badge-sm shrink-0"
                        title="実行後に次を自動実行"
                      >
                        連鎖
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
