import { HiChevronDown, HiChevronUp } from "react-icons/hi";

import { ResourceSelector } from "@/components/Node/utils";

import { CreateChannelStepSchema, type CreateChannelStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

type ChannelItem = CreateChannelStep["channels"][number];
type RolePermission = ChannelItem["rolePermissions"][number];

const nonEmpty = (channels: ChannelItem[]): string[] =>
  channels.map((channel) => channel.name.trim()).filter((name) => name !== "");

const CreateChannelDetailPanel = ({ step, onChange }: DetailPanelProps<CreateChannelStep>) => {
  const updateChannel = (
    index: number,
    field: keyof ChannelItem,
    value: ChannelItem[keyof ChannelItem],
  ) => {
    onChange({
      channels: step.channels.map((channel, i) =>
        i === index ? { ...channel, [field]: value } : channel,
      ),
    });
  };

  const moveChannel = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= step.channels.length) return;
    const updated = [...step.channels];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange({ channels: updated });
  };

  const updateRolePermissions = (channelIndex: number, rolePermissions: RolePermission[]) => {
    updateChannel(channelIndex, "rolePermissions", rolePermissions);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {step.channels.map((channel, channelIndex) => (
          <div
            // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素のオブジェクト配列
            key={`channel-${channelIndex}`}
            className="border border-base-content/20 rounded-lg p-3"
          >
            <div className="flex gap-2 items-center mb-2">
              <input
                type="text"
                className="input input-bordered input-sm flex-1"
                value={channel.name}
                onChange={(evt) => updateChannel(channelIndex, "name", evt.target.value)}
                placeholder="チャンネル名"
              />
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="text-xs">テキスト</span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={channel.type === "voice"}
                  onChange={(evt) =>
                    updateChannel(channelIndex, "type", evt.target.checked ? "voice" : "text")
                  }
                />
                <span className="text-xs">ボイス</span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => moveChannel(channelIndex, -1)}
                disabled={channelIndex === 0}
              >
                <HiChevronUp />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => moveChannel(channelIndex, 1)}
                disabled={channelIndex === step.channels.length - 1}
              >
                <HiChevronDown />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  onChange({ channels: step.channels.filter((_, i) => i !== channelIndex) })
                }
              >
                削除
              </button>
            </div>

            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold">ロール権限</p>
              {channel.rolePermissions.map((perm, roleIndex) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key -- 行 id を持たない素のオブジェクト配列
                  key={`role-${roleIndex}`}
                  className="flex gap-2 items-center"
                >
                  <div className="flex-1">
                    <ResourceSelector
                      nodeId={step.id}
                      resourceType="role"
                      value={perm.roleName}
                      onChange={(roleName) =>
                        updateRolePermissions(
                          channelIndex,
                          channel.rolePermissions.map((p, i) =>
                            i === roleIndex ? { ...p, roleName } : p,
                          ),
                        )
                      }
                      placeholder="ロール名"
                      className="input-xs"
                    />
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <span className="text-xs">読み取り</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-xs"
                      checked={perm.canWrite}
                      onChange={(evt) =>
                        updateRolePermissions(
                          channelIndex,
                          channel.rolePermissions.map((p, i) =>
                            i === roleIndex ? { ...p, canWrite: evt.target.checked } : p,
                          ),
                        )
                      }
                    />
                    <span className="text-xs">書き込み</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() =>
                      updateRolePermissions(
                        channelIndex,
                        channel.rolePermissions.filter((_, i) => i !== roleIndex),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() =>
                  updateRolePermissions(channelIndex, [
                    ...channel.rolePermissions,
                    { roleName: "", canWrite: false },
                  ])
                }
              >
                + ロールを追加
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-sm self-start"
        onClick={() =>
          onChange({
            channels: [...step.channels, { name: "", type: "text", rolePermissions: [] }],
          })
        }
      >
        チャンネルを追加
      </button>
    </div>
  );
};

export const CreateChannelEntry = defineStep<CreateChannelStep>({
  type: "CreateChannel",
  schema: CreateChannelStepSchema,
  category: "action",
  defaults: () => ({
    type: "CreateChannel",
    title: "チャンネルを作成する",
    memo: "",
    autoAdvance: false,
    channels: [],
  }),
  summary: (step) => {
    const names = nonEmpty(step.channels);
    return names.length > 0 ? `チャンネル作成: ${names.join(", ")}` : "チャンネル作成 (未設定)";
  },
  DetailPanel: CreateChannelDetailPanel,
});
