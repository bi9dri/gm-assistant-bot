import { createContext, useContext } from "react";

// メッセージ添付ファイルの OPFS 保存先を識別するための Context。
// edit モードでは templateId、execute モードでは sessionId を供給する
// (旧 SendMessageNode の useTemplateEditorContextOptional().templateId の代替)。
interface AttachmentTarget {
  templateId?: number;
  sessionId?: number;
}

const MessageAttachmentTargetContext = createContext<AttachmentTarget>({});
export const MessageAttachmentTargetProvider = MessageAttachmentTargetContext.Provider;
export const useAttachmentTarget = (): AttachmentTarget =>
  useContext(MessageAttachmentTargetContext);
