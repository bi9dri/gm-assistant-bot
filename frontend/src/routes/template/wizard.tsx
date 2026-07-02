import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import type { FlowData } from "@/flow/schema";

import { Template } from "@/db";
import { TemplateWizard } from "@/flow/wizard/TemplateWizard";
import { useToast } from "@/toast/ToastProvider";

export const Route = createFileRoute("/template/wizard")({
  component: RouteComponent,
  beforeLoad: () => ({ layoutMode: "full-height" as const }),
});

function RouteComponent() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [creating, setCreating] = useState(false);

  const handleCreate = async (name: string, flowData: FlowData) => {
    setCreating(true);
    try {
      const template = await Template.create(name);
      await template.update({ flowData });

      addToast({ message: `テンプレート「${name}」を作成しました`, durationSeconds: 5 });
      void navigate({ to: "/template/$id/steps", params: { id: template.id.toString() } });
    } catch (error) {
      console.error("Failed to create template from wizard:", error);
      addToast({ message: "テンプレートの作成に失敗しました", status: "error" });
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-4 py-3">
        <h2 className="font-semibold">新しいテンプレート</h2>
        <span className="text-xs text-base-content/50">ウィザードで作成</span>
      </div>
      <TemplateWizard onCreate={handleCreate} creating={creating} />
    </div>
  );
}
