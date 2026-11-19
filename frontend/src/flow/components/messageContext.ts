import { createContext, useContext } from "react";

interface AttachmentTarget {
  templateId?: number;
  sessionId?: number;
}

const MessageAttachmentTargetContext = createContext<AttachmentTarget>({});
export const MessageAttachmentTargetProvider = MessageAttachmentTargetContext.Provider;
export const useAttachmentTarget = (): AttachmentTarget =>
  useContext(MessageAttachmentTargetContext);
