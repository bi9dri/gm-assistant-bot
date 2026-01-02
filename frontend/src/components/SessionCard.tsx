import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import React from "react";
import z from "zod";

import { db } from "@/db";
import { FileSystem } from "@/fileSystem";
import { useToast } from "@/toast/ToastProvider";

export const SessionCardSchema = z.object({
  id: z.number(),
  name: z.string().trim().nonempty(),
  guildId: z.string().trim().nonempty(),
  lastUsedAt: z.date(),
});

type Props = z.infer<typeof SessionCardSchema>;

export const SessionCard = ({ id, name, guildId, lastUsedAt }: Props) => {
  const { addToast } = useToast();
  const guild = useLiveQuery(() => db.Guild.get(guildId));

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await db.GameSession.delete(id);
      const fileSystem = new FileSystem();
      await fileSystem.clearSessionFiles(id);

      const checkbox = document.getElementById(`confirmDeleteModal-${id}`) as HTMLInputElement;
      checkbox.checked = false;
      addToast({
        message: "セッションを削除しました",
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
        message: "セッションの削除に失敗しました",
        status: "error",
      });
    }
  };

  return (
    <>
      <div className="card card-shadow-md bg-base-200 w-96 rounded-xs border-2 border-primary">
        <div className="card-body">
          <h5 className="card-title">{name}</h5>

          <div className="flex items-center gap-2 mb-2">
            <img src={guild?.icon} alt={guild?.name} className="w-8 h-8 rounded" />
            <span className="text-sm">{guild?.name}</span>
          </div>

          <p className="text-sm opacity-70">最終使用日時: {lastUsedAt.toLocaleString("ja-JP")}</p>

          <div className="card-actions justify-end">
            <Link to="/session/$id" params={{ id: id.toString() }} className="btn btn-primary">
              詳細を見る
            </Link>
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
