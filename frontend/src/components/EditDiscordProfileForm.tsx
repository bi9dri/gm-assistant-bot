import React, { useEffect, useState } from "react";
import { ZodError } from "zod";

// import { DiscordProfile } from "@/models/discordProfile";
import { useToast } from "@/toast/ToastProvider";

interface Props {
  profileId: number;
}

export const EditDiscordProfileForm = ({ profileId }: Props) => {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void (async () => {
      // const fetchedProfile = await DiscordProfile.getById(profileId);
      // if (!fetchedProfile) {
      //   setName("");
      //   setIcon("");
      //   setDescription("");
      //   return;
      // }
      // setName(fetchedProfile.name);
      // setIcon(fetchedProfile.icon);
      // setDescription(fetchedProfile.description);
    })();
  }, [profileId]);

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      // const data = new DiscordProfile(name, icon, description, profileId);
      // await data.save();
      addToast({
        message: "プロフィールを更新しました",
        durationSeconds: 10,
      });
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
        message: "プロフィールの更新に失敗しました",
        status: "error",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      // await DiscordProfile.delete(profileId);
      const checkbox = document.getElementById(
        `confirmDeleteModal-${profileId}`,
      ) as HTMLInputElement;
      checkbox.checked = false;
      addToast({
        message: "プロフィールを削除しました",
        durationSeconds: 10,
      });
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
        message: "プロフィールの削除に失敗しました",
        status: "error",
      });
    }
  };

  if (!profileId) {
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
              placeholder="プロファイル1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">アイコン (オプション)</legend>
            <input
              type="text"
              className="input"
              placeholder="data:image/png;base64,..."
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">説明 (オプション)</legend>
            <input
              type="text"
              className="input"
              placeholder="説明"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </fieldset>
          <div className="card-actions justify-end">
            <button onClick={handleUpdate} className="btn btn-primary">
              更新
            </button>
            <label htmlFor={`confirmDeleteModal-${profileId}`} className="btn btn-error">
              削除
            </label>
          </div>
        </div>
      </div>

      <input id={`confirmDeleteModal-${profileId}`} type="checkbox" className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <h3 className="text-lg font-bold">「{name}」を削除しますか？</h3>
          <p className="py-4">この操作は元に戻せません。</p>
          <div className="modal-action">
            <label htmlFor={`confirmDeleteModal-${profileId}`} className="btn">
              キャンセル
            </label>
            <button className="btn btn-error" onClick={handleDelete}>
              削除
            </button>
          </div>
        </div>
        <label htmlFor={`confirmDeleteModal-${profileId}`} className="modal-backdrop">
          キャンセル
        </label>
      </div>
    </>
  );
};
