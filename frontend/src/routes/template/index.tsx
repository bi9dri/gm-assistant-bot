import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef } from "react";
import z from "zod";

import { TemplateCard } from "@/components/TemplateCard";
import { db } from "@/db";
import { FileSystem } from "@/fileSystem";
import { useToast } from "@/toast/ToastProvider";

export const Route = createFileRoute("/template/")({
  component: RouteComponent,
});

function RouteComponent() {
  const templates = useLiveQuery(() => db.Template.orderBy("updatedAt").reverse().toArray());
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileSystem = new FileSystem();
      const template = await fileSystem.loadTemplate(file);

      addToast({
        message: `テンプレート「${template.name}」をインポートしました`,
        durationSeconds: 5,
      });
    } catch (error) {
      console.error("Import failed:", error);
      let message = "インポートに失敗しました";
      if (error instanceof z.ZodError) {
        message = "ファイルの形式が正しくありません";
      } else if (error instanceof Error) {
        message = error.message;
      }
      addToast({
        message,
        status: "error",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <h1 className="text-3xl inline-block">テンプレート</h1>
      <Link to="/template/new" className="btn btn-primary ml-8 mb-4">
        新しいテンプレートを作成
      </Link>
      <button onClick={handleImportClick} className="btn btn-info ml-2 mb-4">
        インポート
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/zip"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-wrap gap-8">
        {templates && templates.length === 0 ? (
          <div className="w-full text-center py-16">
            <p className="text-base-content/30 text-lg">テンプレートが作成されていません</p>
          </div>
        ) : (
          templates?.map((t) => (
            <TemplateCard key={t.id} id={t.id} name={t.name} updatedAt={t.updatedAt} />
          ))
        )}
      </div>
    </>
  );
}
