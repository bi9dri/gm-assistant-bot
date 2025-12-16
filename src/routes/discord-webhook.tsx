import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { DiscordWebhook } from "../models/DiscordWebhook";

export const Route = createFileRoute("/discord-webhook")({
  component: RouteComponent,
});

function RouteComponent() {
  const webhooks = useLiveQuery(() => DiscordWebhook.getAll());
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleAdd = async () => {
    const webhook = new DiscordWebhook(name, url);
    const validation = webhook.validate();

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await webhook.save();
      setName("");
      setUrl("");
      setErrors([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "保存に失敗しました"]);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await DiscordWebhook.deleteById(id);
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Discord Webhook 設定</h1>

      <div className="card bg-base-200 mb-4">
        <div className="card-body">
          <h2 className="card-title">新しいWebhookを追加</h2>

          {errors.length > 0 && (
            <div className="alert alert-error">
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text">名前</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 本番環境通知"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Webhook URL</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>

          <div className="card-actions justify-end">
            <button className="btn btn-primary" onClick={handleAdd}>
              追加
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">登録済みWebhook</h2>
        {!webhooks && <p>読み込み中...</p>}
        {webhooks && webhooks.length === 0 && (
          <p className="text-gray-500">Webhookが登録されていません</p>
        )}
        {webhooks?.map((webhook) => (
          <div key={webhook.id} className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{webhook.name}</h3>
                  <p className="text-sm text-gray-600 truncate max-w-md">
                    {webhook.url}
                  </p>
                </div>
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => webhook.id && handleDelete(webhook.id)}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
