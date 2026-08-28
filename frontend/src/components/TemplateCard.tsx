import { Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import z from "zod";

import { TemplateMetaModal } from "@/components/TemplateMetaModal";
import { db, TemplateMetaSchema } from "@/db";
import { FileSystem } from "@/fileSystem";
import { formatDuration, formatPlayerCount } from "@/templateFilter";
import { useToast } from "@/toast/ToastProvider";

const TemplateCardSchema = z.object({
  id: z.number(),
  name: z.string().trim().nonempty(),
  updatedAt: z.date().optional(),
  meta: TemplateMetaSchema,
  // シナリオ形式のブロックを持つか。持つ場合だけシナリオ編集への導線を出す (docs: scenario-editor-architecture D12)。
  hasScenario: z.boolean(),
});

type Props = z.infer<typeof TemplateCardSchema>;

// OPFS のカバー画像は blob URL 経由でしか <img> に渡せない。
const useCoverUrl = (coverPath: string | undefined): string | undefined => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!coverPath) {
      setUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    new FileSystem()
      .readFile(coverPath)
      .then((file) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(undefined);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverPath]);

  return url;
};

export const TemplateCard = ({ id, name, updatedAt, meta, hasScenario }: Props) => {
  const { addToast } = useToast();
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const coverUrl = useCoverUrl(meta.coverPath);
  const badges = [meta.system, formatPlayerCount(meta), formatDuration(meta)].filter(
    (badge) => badge !== undefined,
  );

  const handleExport = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const fileSystem = new FileSystem();
      const blob = await fileSystem.exportTemplate(id);
      const filename = `${name}_template.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        message: `テンプレート「${name}」をエクスポートしました`,
        durationSeconds: 5,
      });
    } catch (error) {
      console.error("Export failed:", error);
      addToast({
        message: "エクスポートに失敗しました",
        status: "error",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await db.Template.delete(id);
      const fileSystem = new FileSystem();
      await fileSystem.clearTemplateFiles(id);

      const checkbox = document.getElementById(`confirmDeleteModal-${id}`) as HTMLInputElement;
      if (checkbox) checkbox.checked = false;
      addToast({
        message: "テンプレートを削除しました",
        durationSeconds: 10,
      });
    } catch (error) {
      if (error instanceof Error) {
        addToast({
          message: error.message,
          status: "error",
        });
        return;
      }
      addToast({
        message: "テンプレートの削除に失敗しました",
        status: "error",
      });
    }
  };

  return (
    <>
      <div className="card card-shadow-md bg-base-200 w-96 rounded-xs border-2 border-primary">
        {coverUrl && (
          <figure className="h-32">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          </figure>
        )}
        <div className="card-body">
          <h5 className="card-title">{name}</h5>
          {hasScenario && <span className="badge badge-primary w-fit">シナリオ形式</span>}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {badges.map((badge) => (
                <span key={badge} className="badge badge-outline">
                  {badge}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm opacity-70">
            最終更新: {updatedAt ? updatedAt.toLocaleString("ja-JP") : "未更新"}
          </p>
          <div className="card-actions justify-end">
            <Link to="/template/$id" params={{ id: id.toString() }} className="btn btn-primary">
              編集
            </Link>
            <Link
              to="/template/$id/steps"
              params={{ id: id.toString() }}
              className="btn btn-secondary"
            >
              ステップ編集
            </Link>
            {hasScenario && (
              <Link
                to="/template/$id/scenario"
                params={{ id: id.toString() }}
                className="btn btn-secondary"
              >
                シナリオ編集
              </Link>
            )}
            <button onClick={() => setMetaModalOpen(true)} className="btn btn-accent">
              メタ情報
            </button>
            <button onClick={handleExport} className="btn btn-info">
              エクスポート
            </button>
            <label htmlFor={`confirmDeleteModal-${id}`} className="btn btn-error">
              削除
            </label>
          </div>
        </div>
      </div>

      {metaModalOpen && (
        <TemplateMetaModal
          id={id}
          name={name}
          meta={meta}
          onClose={() => setMetaModalOpen(false)}
        />
      )}

      <input id={`confirmDeleteModal-${id}`} type="checkbox" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="text-lg font-bold">「{name}」を削除しますか？</h3>
          <p className="py-4">この操作は元に戻せません。</p>
          <div className="modal-action">
            <label htmlFor={`confirmDeleteModal-${id}`} className="btn">
              キャンセル
            </label>
            <button className="btn btn-error" onClick={handleDelete}>
              削除
            </button>
          </div>
        </div>
        <label htmlFor={`confirmDeleteModal-${id}`} className="modal-backdrop">
          キャンセル
        </label>
      </div>
    </>
  );
};
