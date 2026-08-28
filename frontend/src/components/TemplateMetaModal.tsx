import { useState } from "react";

import { saveFileToOPFS } from "@/components/Node/utils/messageSchema";
import { Template, type TemplateMeta } from "@/db";
import { useToast } from "@/toast/ToastProvider";

interface Props {
  id: number;
  name: string;
  meta: TemplateMeta;
  onClose: () => void;
}

type FormState = Record<keyof TemplateMeta, string>;

const toForm = (meta: TemplateMeta): FormState => ({
  system: meta.system ?? "",
  playerCountMin: meta.playerCountMin?.toString() ?? "",
  playerCountMax: meta.playerCountMax?.toString() ?? "",
  durationMinutesMin: meta.durationMinutesMin?.toString() ?? "",
  durationMinutesMax: meta.durationMinutesMax?.toString() ?? "",
  coverPath: meta.coverPath ?? "",
});

const toNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
};

const toOptionalString = (value: string): string | undefined => value.trim() || undefined;

// 呼び出し側で開いている間だけマウントする (閉じるたびに編集中の値が捨てられる)。
export const TemplateMetaModal = ({ id, name, meta, onClose }: Props) => {
  const { addToast } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(meta));

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      set("coverPath", await saveFileToOPFS(file, { templateId: id }));
    } catch (error) {
      console.error("Cover upload failed:", error);
      addToast({ message: "カバー画像の保存に失敗しました", status: "error" });
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    const next: TemplateMeta = {
      system: toOptionalString(form.system),
      playerCountMin: toNumber(form.playerCountMin),
      playerCountMax: toNumber(form.playerCountMax),
      durationMinutesMin: toNumber(form.durationMinutesMin),
      durationMinutesMax: toNumber(form.durationMinutesMax),
      coverPath: toOptionalString(form.coverPath),
    };

    if (
      (next.playerCountMin ?? 0) > (next.playerCountMax ?? Infinity) ||
      (next.durationMinutesMin ?? 0) > (next.durationMinutesMax ?? Infinity)
    ) {
      addToast({ message: "範囲の下限が上限を超えています", status: "error" });
      return;
    }

    try {
      const template = await Template.getById(id);
      if (!template) throw new Error("テンプレートが見つかりません");
      await template.update({ meta: next });
      addToast({ message: "メタ情報を保存しました", durationSeconds: 5 });
      onClose();
    } catch (error) {
      console.error("Failed to save template meta:", error);
      addToast({ message: "メタ情報の保存に失敗しました", status: "error" });
    }
  };

  return (
    <div className="modal modal-open" role="dialog">
      <div className="modal-box">
        <h3 className="text-lg font-bold">「{name}」のメタ情報</h3>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">システム</legend>
          <input
            type="text"
            className="input w-full"
            placeholder="クトゥルフ神話TRPG など"
            value={form.system}
            onChange={(e) => set("system", e.target.value)}
          />
          <legend className="fieldset-legend">プレイヤー人数</legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="input w-24"
              aria-label="プレイヤー人数の下限"
              value={form.playerCountMin}
              onChange={(e) => set("playerCountMin", e.target.value)}
            />
            <span>〜</span>
            <input
              type="number"
              min={1}
              className="input w-24"
              aria-label="プレイヤー人数の上限"
              value={form.playerCountMax}
              onChange={(e) => set("playerCountMax", e.target.value)}
            />
            <span>人</span>
          </div>
          <legend className="fieldset-legend">所要時間の目安</legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              step={15}
              className="input w-24"
              aria-label="所要時間の下限"
              value={form.durationMinutesMin}
              onChange={(e) => set("durationMinutesMin", e.target.value)}
            />
            <span>〜</span>
            <input
              type="number"
              min={1}
              step={15}
              className="input w-24"
              aria-label="所要時間の上限"
              value={form.durationMinutesMax}
              onChange={(e) => set("durationMinutesMax", e.target.value)}
            />
            <span>分</span>
          </div>
          <legend className="fieldset-legend">カバー画像</legend>
          <input
            type="file"
            accept="image/*"
            className="file-input w-full"
            aria-label="カバー画像"
            onChange={handleCoverChange}
          />
          {form.coverPath && (
            <p className="text-sm opacity-70 break-all">
              {form.coverPath}
              <button className="btn btn-ghost btn-xs ml-2" onClick={() => set("coverPath", "")}>
                削除
              </button>
            </p>
          )}
        </fieldset>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
      <button className="modal-backdrop" onClick={onClose}>
        キャンセル
      </button>
    </div>
  );
};
