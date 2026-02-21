import type { GameSession } from "@/db/models/GameSession";
import type { ReactFlowData } from "@/db/schemas";

import { db } from "@/db";
import { defaultReactFlowData } from "@/db/schemas";

interface SessionFactoryOptions {
  name?: string;
  guildId?: string;
  botId?: string;
  gameFlags?: Record<string, unknown>;
  reactFlowData?: ReactFlowData;
}

export async function createTestSession(options: SessionFactoryOptions = {}): Promise<GameSession> {
  const {
    name = "Test Session",
    guildId = "guild-123",
    botId = "bot-456",
    gameFlags = {},
    reactFlowData = defaultReactFlowData,
  } = options;

  const { GameSession } = await import("@/db/models/GameSession");

  const id = await db.GameSession.add({
    name,
    guildId,
    botId,
    gameFlags: JSON.stringify(gameFlags),
    reactFlowData: JSON.stringify(reactFlowData),
    createdAt: new Date(),
    lastUsedAt: new Date(),
  });

  const session = await GameSession.getById(id);
  if (!session) {
    throw new Error("Failed to create test session");
  }
  return session;
}
