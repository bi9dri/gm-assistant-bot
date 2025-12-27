import React from "react";
import z from "zod";

import { db } from "@/db";
import { useToast } from "@/toast/ToastProvider";

export const BotCardSchema = z.object({
  id: z.string().trim().nonempty(),
  name: z.string().trim().nonempty(),
  icon: z.url(),
});

type Props = z.infer<typeof BotCardSchema>;

export const BotCard = ({ id, name, icon }: Props) => {
  const { addToast } = useToast();

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await db.DiscordBot.delete(id);
      const checkbox = document.getElementById(`confirmDeleteModal-${id}`) as HTMLInputElement;
      checkbox.checked = false;
      addToast({
        message: "Botを削除しました",
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
        message: "Botの削除に失敗しました",
        status: "error",
      });
    }
  };

  return (
    <>
      <div className="card card-shadow-md bg-base-200 w-96 rounded-xs border-2 border-primary">
        <div className="card-body">
          <div className="flex items-center gap-4 mb-4">
            <img src={icon} alt={`${name} icon`} className="w-16 h-16 rounded-full" />
            <h5 className="card-title">{name}</h5>
          </div>
          <div className="card-actions justify-end">
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
