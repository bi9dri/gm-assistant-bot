import { useState, type MouseEvent } from "react";

interface Props {
  onSubmit: (name: string, url: string) => Promise<void>;
}

export const CreateDiscordWebhookForm = ({ onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await onSubmit(name, url);
    setName("");
    setUrl("");
  };

  return (
    <div className="card lg:w-160 w-full shadow-md">
      <div className="card-body">
        <h2 className="text-xl">新しいWebhookを追加する</h2>
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
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            追加
          </button>
        </div>
      </div>
    </div>
  );
};
