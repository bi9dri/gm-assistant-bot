import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import z from "zod";

import { TemplateCard } from "@/components/TemplateCard";
import { db } from "@/db";
import { FileSystem } from "@/fileSystem";
import { matchesTemplateFilter, type TemplateFilterCriteria } from "@/templateFilter";
import { useToast } from "@/toast/ToastProvider";

// 所要時間は「以内」で絞るため選択肢を固定する (分)。
const DURATION_OPTIONS = [60, 120, 180, 240, 360];

export const Route = createFileRoute("/template/")({
  component: RouteComponent,
});

function RouteComponent() {
  const templates = useLiveQuery(() => db.Template.orderBy("updatedAt").reverse().toArray());
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [criteria, setCriteria] = useState<TemplateFilterCriteria>({});

  // 件数が高々数十なのでインデックス検索はせず、取得済みの一覧を絞る
  // (複数条件の AND は Dexie でも結局 1 インデックス + フィルタになる)。
  const systems = [...new Set(templates?.map((t) => t.system).filter((s) => s !== undefined))];
  // 選択中のシステムが編集で一覧から消えることがある。選択肢に無い値は「すべて」に戻す。
  const system =
    criteria.system !== undefined && systems.includes(criteria.system)
      ? criteria.system
      : undefined;
  const visibleTemplates = templates?.filter((t) =>
    matchesTemplateFilter(t, { ...criteria, system }),
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileSystem = new FileSystem();
      const template = await fileSystem.importTemplate(file);

      addToast({
        message: `テンプレート「${template.name}」をインポートしました`,
        durationSeconds: 5,
      });
    } catch (error) {
      console.error("Import failed:", error);
      let message = "インポートに失敗しました";
      if (error instanceof z.ZodError) {
        message = "ファイルの形式が正しくありません";
      } else if (error instanceof Error) {
        message = error.message;
      }
      addToast({
        message,
        status: "error",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <h1 className="text-3xl inline-block">テンプレート</h1>
      <Link to="/template/new" className="btn btn-primary ml-8 mb-4">
        新しいテンプレートを作成
      </Link>
      <Link to="/template/wizard" className="btn btn-secondary ml-2 mb-4">
        ウィザードで作成
      </Link>
      <button onClick={handleImportClick} className="btn btn-info ml-2 mb-4">
        インポート
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/zip"
        onChange={handleFileChange}
        className="hidden"
      />
      {templates && templates.length > 0 && (
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <label className="floating-label">
            <span>システム</span>
            <select
              className="select w-56"
              aria-label="システムで絞り込む"
              value={system ?? ""}
              onChange={(e) =>
                setCriteria((prev) => ({ ...prev, system: e.target.value || undefined }))
              }
            >
              <option value="">すべて</option>
              {systems.map((system) => (
                <option key={system} value={system}>
                  {system}
                </option>
              ))}
            </select>
          </label>
          <label className="floating-label">
            <span>プレイヤー人数</span>
            <input
              type="number"
              min={1}
              className="input w-40"
              aria-label="プレイヤー人数で絞り込む"
              value={criteria.playerCount ?? ""}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  playerCount: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="floating-label">
            <span>所要時間</span>
            <select
              className="select w-40"
              aria-label="所要時間で絞り込む"
              value={criteria.maxDurationMinutes ?? ""}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  maxDurationMinutes: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
            >
              <option value="">指定なし</option>
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes / 60}時間以内
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-8">
        {visibleTemplates && visibleTemplates.length === 0 ? (
          <div className="w-full text-center py-16">
            <p className="text-base-content/30 text-lg">
              {templates?.length === 0
                ? "テンプレートが作成されていません"
                : "条件に合うテンプレートがありません"}
            </p>
          </div>
        ) : (
          visibleTemplates?.map((t) => (
            <TemplateCard key={t.id} id={t.id} name={t.name} updatedAt={t.updatedAt} meta={t} />
          ))
        )}
      </div>
    </>
  );
}
