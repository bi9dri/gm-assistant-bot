import { createContext, useContext } from "react";

import type { DiscordBotData } from "@/db";

interface NodeExecutionContextValue {
  guildId: string;
  bot: DiscordBotData;
}

export const NodeExecutionContext = createContext<NodeExecutionContextValue | null>(null);

export function useNodeExecution() {
  const context = useContext(NodeExecutionContext);
  if (!context) {
    throw new Error("useNodeExecution must be used within NodeExecutionContext.Provider");
  }
  return context;
}

export function useNodeExecutionOptional() {
  return useContext(NodeExecutionContext);
}
