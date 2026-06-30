import type { GameSession } from "@/db/models/GameSession";
import type { ReactFlowData } from "@/db/schemas";
import type { FlowData } from "@/flow/schema";

import { db } from "@/db";
import { defaultReactFlowData } from "@/db/schemas";
import { defaultFlowData } from "@/flow/schema";

interface SessionFactoryOptions {
  name?: string;
  guildId?: string;
  botId?: string;
  gameFlags?: Record<string, unknown>;
  reactFlowData?: ReactFlowData;
  flowData?: FlowData;
}

export async function createTestSession(options: SessionFactoryOptions = {}): Promise<GameSession> {
  const {
    name = "Test Session",
    guildId = "guild-123",
    botId = "bot-456",
    gameFlags = {},
    reactFlowData = defaultReactFlowData,
    flowData = defaultFlowData,
  } = options;

  const { GameSession } = await import("@/db/models/GameSession");

  const id = await db.GameSession.add({
    name,
    guildId,
    botId,
    gameFlags: JSON.stringify(gameFlags),
    reactFlowData: JSON.stringify(reactFlowData),
    flowData: JSON.stringify(flowData),
    createdAt: new Date(),
    lastUsedAt: new Date(),
  });

  const session = await GameSession.getById(id);
  if (!session) {
    throw new Error("Failed to create test session");
  }
  return session;
}
