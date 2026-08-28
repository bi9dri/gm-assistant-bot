import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Template } from "@/db";
import { generateId } from "@/flow/ids";
import { TextEntry } from "@/flow/registry/Text";
import type { Step } from "@/flow/schema";
import { useToast } from "@/toast/ToastProvider";

export const Route = createFileRoute("/template/new")({
  component: RouteComponent,
  beforeLoad: () => {
    return {
      layoutMode: "full-height" as const,
    };
  },
});

// 新規テンプレートはシナリオ形式のみを作る (docs: scenario-editor-architecture D15)。
// 空のブロック列にしないのは、v9 で全既存レコードに空の scenarioData が backfill されており、
// 「空 = 旧形式」と区別できず一覧のバッジと導線が出せないため。
const initialBlocks = (): Step[] => [{ ...TextEntry.defaults(), id: generateId() } as Step];

function RouteComponent() {
  const [templateName, setTemplateName] = useState("");
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleCreate = async () => {
    try {
      const template = await Template.create(templateName);
      await template.update({ scenarioData: { version: 1, blocks: initialBlocks() } });

      addToast({
        message: `テンプレート「${templateName}」を作成しました`,
        durationSeconds: 5,
      });

      void navigate({ to: "/template/$id/scenario", params: { id: template.id.toString() } });
    } catch (error) {
      console.error("Failed to create template:", error);
      addToast({
        message: "テンプレートの作成に失敗しました",
        status: "error",
      });
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">新しいシナリオを作成</h2>
      <p className="text-sm text-base-content/60">
        シナリオ本文を書きながら Discord 操作ブロックを差し込む形式で作成します。
      </p>
      <div className="flex w-full max-w-md gap-2">
        <input
          type="text"
          placeholder="テンプレート名を入力"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="input input-bordered flex-1"
        />
        <button onClick={handleCreate} disabled={!templateName.trim()} className="btn btn-primary">
          作成
        </button>
      </div>
    </div>
  );
}
