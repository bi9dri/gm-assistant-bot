import { createContext, useContext } from "react";

import type { DiscordBotData } from "@/db";

interface NodeExecutionContextValue {
  guildId: string;
  sessionId: number;
  sessionName: string;
  bot: DiscordBotData;
}

export const NodeExecutionContext = createContext<NodeExecutionContextValue | null>(null);

export function useNodeExecutionOptional() {
  return useContext(NodeExecutionContext);
}
