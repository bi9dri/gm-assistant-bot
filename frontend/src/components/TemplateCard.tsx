import { Link } from "@tanstack/react-router";
import React from "react";
import z from "zod";

import { db } from "@/db";
import { FileSystem } from "@/fileSystem";
import { useToast } from "@/toast/ToastProvider";

const TemplateCardSchema = z.object({
  id: z.number(),
  name: z.string().trim().nonempty(),
  updatedAt: z.date().optional(),
});

type Props = z.infer<typeof TemplateCardSchema>;

export const TemplateCard = ({ id, name, updatedAt }: Props) => {
  const { addToast } = useToast();

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
        <div className="card-body">
          <h5 className="card-title">{name}</h5>
          <p className="text-sm opacity-70">
            最終更新: {updatedAt ? updatedAt.toLocaleString("ja-JP") : "未更新"}
          </p>
          <div className="card-actions justify-end">
            <Link to="/template/$id" params={{ id: id.toString() }} className="btn btn-primary">
              編集
            </Link>
            <button onClick={handleExport} className="btn btn-info">
              エクスポート
            </button>
            <label htmlFor={`confirmDeleteModal-${id}`} className="btn btn-error">
              削除
            </label>
          </div>
        </div>
      </div>

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
