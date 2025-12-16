import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { DiscordProfile } from "../models/DiscordProfile";

export const Route = createFileRoute("/discord-profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const profiles = useLiveQuery(() => DiscordProfile.getAll());
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleAdd = async () => {
    const profile = new DiscordProfile(name, icon, description);
    const validation = profile.validate();

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await profile.save();
      setName("");
      setIcon("");
      setDescription("");
      setErrors([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "保存に失敗しました"]);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await DiscordProfile.deleteById(id);
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Discord Bot プロフィール設定</h1>

      <div className="card bg-base-200 mb-4">
        <div className="card-body">
          <h2 className="card-title">新しいプロフィールを追加</h2>

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
              placeholder="例: GM Assistant"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">アイコンURL</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">説明</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Botの説明を入力してください（最大500文字）"
              rows={3}
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
        <h2 className="text-xl font-bold">登録済みプロフィール</h2>
        {!profiles && <p>読み込み中...</p>}
        {profiles && profiles.length === 0 && (
          <p className="text-gray-500">プロフィールが登録されていません</p>
        )}
        {profiles?.map((profile) => (
          <div key={profile.id} className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <img
                    src={profile.icon}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64";
                    }}
                  />
                  <div>
                    <h3 className="font-bold">{profile.name}</h3>
                    <p className="text-sm text-gray-600">{profile.description}</p>
                  </div>
                </div>
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => profile.id && handleDelete(profile.id)}
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
