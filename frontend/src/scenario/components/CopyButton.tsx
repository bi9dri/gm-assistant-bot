import { useToast } from "@/toast/ToastProvider";

// クリップボードへのコピー (docs: scenario-editor-architecture D13)。ココフォリアは外部から
// 書き込む API を持たず、貼り付けが公式の経路。送信先を選ばせる分岐は作らないため、
// Discord への手動送信やメモの持ち出しにもそのまま使える。
export const CopyButton = ({ text }: { text: string }) => {
  const { addToast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ message: "コピーしました", status: "success", durationSeconds: 2 });
    } catch {
      // 権限拒否・非セキュアコンテキストではコピーが起きない。無反応だと貼り付けて
      // 初めて気づくため、失敗を明示する。
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
