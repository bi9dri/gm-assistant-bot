import { DiscordWebhook } from "@/models/discordWebhook";
import { useToast } from "@/toast/ToastProvider";
import React, { useState, useEffect } from "react";
import { ZodError } from "zod";

interface Props {
  webhookId: number;
}

export const EditWebhookForm = ({ webhookId }: Props) => {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    (async () => {
      const fetchedWebhook = await DiscordWebhook.getById(webhookId);
      if (!fetchedWebhook) {
        setName("");
        setUrl("");
        return;
      }
      setName(fetchedWebhook.name);
      setUrl(fetchedWebhook.url);
    })();
  }, [webhookId]);

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const data = new DiscordWebhook(name, url, webhookId);
      await data.save();
    } catch (error) {
      if (error instanceof ZodError) {
        addToast({
          message: error.issues.map((i) => i.message).join("\n"),
          status: "error",
        });
        return;
      }
      if (error instanceof Error) {
        addToast({
          message: error.message,
          status: "error",
        });
        return;
      }
      addToast({
        message: "更新に失敗しました",
        status: "error",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await DiscordWebhook.delete(webhookId);
      const checkbox = document.getElementById("confirmDeleteModal") as HTMLInputElement;
      checkbox.checked = false;
    } catch (error) {
      if (error instanceof ZodError) {
        addToast({
          message: error.issues.map((i) => i.message).join("\n"),
          status: "error",
        });
        return;
      }
      if (error instanceof Error) {
        addToast({
          message: error.message,
          status: "error",
        });
        return;
      }
      addToast({
        message: "削除に失敗しました",
        status: "error",
      });
    }
  };

  if (!webhookId) {
    return <></>;
  }

  return (
    <>
      <div className="card lg:w-160 w-full shadow-md">
        <div className="card-body">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">名前</legend>
            <input
              type="text"
              className="input"
              placeholder="Webhook1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">URL</legend>
            <input
              type="url"
              className="input"
              placeholder="https://discord.com/api/webhooks/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </fieldset>
          <div className="card-actions justify-end">
            <button onClick={handleUpdate} className="btn btn-primary">
              更新
            </button>
            <label htmlFor="confirmDeleteModal" className="btn btn-error">
              削除
            </label>
          </div>
        </div>
      </div>

      <input id="confirmDeleteModal" type="checkbox" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="text-lg font-bold">「{name}」を削除しますか？</h3>
          <p className="py-4">この操作は元に戻せません。</p>
          <div className="modal-action">
            <label htmlFor="confirmDeleteModal" className="btn">
              キャンセル
            </label>
            <button className="btn btn-error" onClick={handleDelete}>
              削除
            </button>
          </div>
        </div>
        <label htmlFor="confirmDeleteModal" className="modal-backdrop">
          キャンセル
        </label>
      </div>
    </>
  );
};
