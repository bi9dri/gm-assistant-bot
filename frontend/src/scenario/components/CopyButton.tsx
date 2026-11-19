import { useToast } from "@/toast/ToastProvider";

export const CopyButton = ({ text }: { text: string }) => {
  const { addToast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ message: "コピーしました", status: "success", durationSeconds: 2 });
    } catch {
      addToast({ message: "コピーに失敗しました", status: "error", durationSeconds: 5 });
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs shrink-0"
      title="本文をクリップボードにコピーする"
      onClick={() => {
        void copy();
      }}
    >
      コピー
    </button>
  );
};
