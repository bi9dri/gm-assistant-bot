import { Panel } from "@xyflow/react";
import { useLiveQuery } from "dexie-react-hooks";
import { LuFlag, LuHash, LuMic, LuPanelRight, LuUsers, LuX } from "react-icons/lu";

import { db, GameSession } from "@/db";
import type { ChannelData, GameFlags, RoleData } from "@/db/schemas";

interface SessionResourcePanelProps {
  sessionId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SessionResourcePanel({ sessionId, isOpen, onClose }: SessionResourcePanelProps) {
  const resources = useLiveQuery(async () => {
    const [roles, channels, session] = await Promise.all([
      db.Role.where("sessionId").equals(sessionId).toArray(),
      db.Channel.where("sessionId").equals(sessionId).toArray(),
      GameSession.getById(sessionId),
    ]);

    return {
      roles,
      channels,
      gameFlags: session?.getParsedGameFlags() ?? {},
    };
  }, [sessionId]);

  if (!isOpen) return null;

  return (
    <Panel position="top-right" className="w-72 max-h-[calc(100%-2rem)] overflow-y-auto bg-base-200 rounded-box shadow-xl m-2">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between p-3 bg-base-200 border-b border-base-300 z-10 rounded-t-box">
        <div className="flex items-center gap-2">
          <LuPanelRight size={18} />
          <h2 className="font-bold">リソース</h2>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-xs btn-square" aria-label="閉じる">
          <LuX size={16} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Roles Section */}
        <RoleSection roles={resources?.roles ?? []} />

        {/* Channels Section */}
        <ChannelSection channels={resources?.channels ?? []} />

        {/* Game Flags Section */}
        <GameFlagSection flags={resources?.gameFlags ?? {}} />
      </div>
    </Panel>
  );
}

function RoleSection({ roles }: { roles: RoleData[] }) {
  return (
    <div className="collapse collapse-arrow bg-base-100 rounded-box">
      <input type="checkbox" defaultChecked />
      <div className="collapse-title text-sm font-medium flex items-center gap-2 min-h-0 py-2">
        <LuUsers size={14} />
        ロール
        <span className="badge badge-xs">{roles.length}</span>
      </div>
      <div className="collapse-content text-sm">
        {roles.length === 0 ? (
          <p className="text-base-content/60">ロールはありません</p>
        ) : (
          <ul className="space-y-1">
            {roles.map((role) => (
              <li key={role.id} className="flex items-center gap-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                {role.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChannelSection({ channels }: { channels: ChannelData[] }) {
  const textChannels = channels.filter((ch) => ch.type === "text");
  const voiceChannels = channels.filter((ch) => ch.type === "voice");

  return (
    <div className="collapse collapse-arrow bg-base-100 rounded-box">
      <input type="checkbox" defaultChecked />
      <div className="collapse-title text-sm font-medium flex items-center gap-2 min-h-0 py-2">
        <LuHash size={14} />
        チャンネル
        <span className="badge badge-xs">{channels.length}</span>
      </div>
      <div className="collapse-content text-sm space-y-2">
        {channels.length === 0 ? (
          <p className="text-base-content/60">チャンネルはありません</p>
        ) : (
          <>
            {textChannels.length > 0 && (
              <div>
                <p className="text-xs text-base-content/60 mb-1">テキストチャンネル</p>
                <ul className="space-y-0.5">
                  {textChannels.map((channel) => (
                    <li key={channel.id} className="flex items-center gap-2 py-0.5">
                      <LuHash size={12} className="text-base-content/60" />
                      {channel.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {voiceChannels.length > 0 && (
              <div>
                <p className="text-xs text-base-content/60 mb-1">ボイスチャンネル</p>
                <ul className="space-y-0.5">
                  {voiceChannels.map((channel) => (
                    <li key={channel.id} className="flex items-center gap-2 py-0.5">
                      <LuMic size={12} className="text-base-content/60" />
                      {channel.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GameFlagSection({ flags }: { flags: GameFlags }) {
  const entries = Object.entries(flags);

  return (
    <div className="collapse collapse-arrow bg-base-100 rounded-box">
      <input type="checkbox" defaultChecked />
      <div className="collapse-title text-sm font-medium flex items-center gap-2 min-h-0 py-2">
        <LuFlag size={14} />
        ゲームフラグ
        <span className="badge badge-xs">{entries.length}</span>
      </div>
      <div className="collapse-content text-sm">
        {entries.length === 0 ? (
          <p className="text-base-content/60">フラグはありません</p>
        ) : (
          <ul className="space-y-1">
            {entries.map(([key, value]) => (
              <li key={key} className="py-0.5">
                <span className="font-mono text-primary">{key}</span>
                <span className="text-base-content/60">: </span>
                <span className="font-mono">{JSON.stringify(value)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
