import { useState, type MouseEvent } from "react";

interface Props {
  onSubmit: (name: string, icon: string, description: string) => Promise<void>;
}

export const CreateDiscordProfileForm = ({ onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await onSubmit(name, icon, description);
    setName("");
    setIcon("");
    setDescription("");
  };

  return (
    <div className="card lg:w-160 w-full shadow-md">
      <div className="card-body">
        <h2 className="text-xl">新しいプロファイルを追加する</h2>
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
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            追加
          </button>
        </div>
      </div>
    </div>
  );
};
