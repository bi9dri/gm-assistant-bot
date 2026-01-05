import { type MouseEvent, useState } from "react";

import { ApiClient } from "@/api";
import { db } from "@/db";
import { useToast } from "@/toast/ToastProvider";

interface Props {
  onCreate?: () => void;
  onCancel?: () => void;
}

export const CreateBot = ({ onCreate, onCancel }: Props) => {
  const { addToast } = useToast();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    icon: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!token.trim()) {
      addToast({
        message: "Bot Tokenを入力してください",
        status: "warning",
      });
      return;
    }

    setIsValidating(true);
    try {
      const client = new ApiClient(token);
      const fetchedProfile = await client.getProfile();
      setProfile(fetchedProfile);
    } catch {
      addToast({
        message: "無効なBot Tokenです",
        status: "error",
      });
      setProfile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!profile) {
      return;
    }

    try {
      const existing = await db.DiscordBot.get(profile.id);
      if (existing) {
        addToast({
          message: "このBotは既に登録されています",
          status: "warning",
        });
        return;
      }

      await db.DiscordBot.add({
        id: profile.id,
        name: profile.name,
        token: token,
        icon: profile.icon,
      });

      addToast({
        message: `Bot「${profile.name}」を登録しました`,
        status: "success",
        durationSeconds: 5,
      });

      if (onCreate) {
        onCreate();
      }
    } catch (error) {
      console.error("Failed to save bot:", error);
      addToast({
        message: "保存に失敗しました",
        status: "error",
      });
    }
  };

  return (
    <div className="card lg:w-120 w-full bg-base-200 rounded-xs border-2 border-secondary shadow-md">
      <div className="card-body">
        <h2 className="text-xl">新しいBotを追加</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Bot Token</legend>
          <input
            type="password"
            className="input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bot Tokenを入力してください"
            required
          />
        </fieldset>

        <div className="card-actions justify-start">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!token.trim() || isValidating}
            onClick={handleValidate}
          >
            {isValidating ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                検証中...
              </>
            ) : (
              "プロファイルを取得"
            )}
          </button>
        </div>

        {profile && (
          <div className="mt-4 p-4 bg-base-300 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Botプロファイル</h3>
            <div className="flex items-center gap-4">
              <img
                src={profile.icon}
                alt={`${profile.name} icon`}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <p className="font-medium">{profile.name}</p>
                <p className="text-sm opacity-70">ID: {profile.id}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          {onCancel && (
            <button type="button" className="btn" onClick={onCancel}>
              キャンセル
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!profile}
            onClick={handleSave}
          >
            登録
          </button>
        </div>
      </div>
    </div>
  );
};
