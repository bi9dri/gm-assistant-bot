import { LuChevronDown, LuChevronRight } from "react-icons/lu";

import { ResourceSelector } from "@/components/Node/utils/ResourceSelector";

import { MessageBlocksEditor } from "../components/MessageBlocksEditor";
import { generateId } from "../ids";
import { CombinationSendMessageStepSchema, type CombinationSendMessageStep } from "../schema";
import { defineStep, type DetailPanelProps } from "./types";

type Entry = CombinationSendMessageStep["entries"][number];

const newEntry = (): Entry => ({
  id: generateId(),
  channelName: "",
  messages: [{ content: "", attachments: [] }],
  collapsed: false,
});

const CombinationSendMessageDetailPanel = ({
  step,
  onChange,
}: DetailPanelProps<CombinationSendMessageStep>) => {
  const updateEntry = (entryIndex: number, patch: Partial<Entry>) =>
    onChange({
      entries: step.entries.map((entry, i) => (i === entryIndex ? { ...entry, ...patch } : entry)),
    });

  return (
    <div className="space-y-2">
      {step.entries.map((entry, entryIndex) => (
        <div key={entry.id} className="overflow-hidden rounded-lg border border-base-content/20">
          <div className="flex items-center gap-2 bg-base-200/50 px-3 py-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs p-0"
              onClick={() => updateEntry(entryIndex, { collapsed: !entry.collapsed })}
            >
              {entry.collapsed ? (
                <LuChevronRight className="h-4 w-4" />
              ) : (
                <LuChevronDown className="h-4 w-4" />
              )}
            </button>
            <span className="flex-1 text-xs font-semibold">
              グループ {entryIndex + 1}
              {entry.channelName && (
                <span className="ml-1 font-normal text-base-content/60">— {entry.channelName}</span>
              )}
            </span>
            {step.entries.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() =>
                  onChange({ entries: step.entries.filter((_, i) => i !== entryIndex) })
                }
              >
                ×
              </button>
            )}
          </div>

          {!entry.collapsed && (
            <div className="space-y-3 p-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">送信先チャンネル</label>
                <ResourceSelector
                  nodeId={step.id}
                  resourceType="channel"
                  value={entry.channelName}
                  onChange={(channelName) => updateEntry(entryIndex, { channelName })}
                  placeholder="チャンネル名"
                  channelTypeFilter="text"
                />
              </div>
              <MessageBlocksEditor
                nodeId={step.id}
                messages={entry.messages}
                onChange={(messages) => updateEntry(entryIndex, { messages })}
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline btn-sm w-full"
        onClick={() => onChange({ entries: [...step.entries, newEntry()] })}
      >
        + グループを追加
      </button>
    </div>
  );
};

export const CombinationSendMessageEntry = defineStep<CombinationSendMessageStep>({
  type: "CombinationSendMessage",
  schema: CombinationSendMessageStepSchema,
  category: "action",
  defaults: () => ({
    type: "CombinationSendMessage",
    title: "組み合わせメッセージを送信する",
    memo: "",
    autoAdvance: false,
    entries: [newEntry()],
  }),
  summary: (step) => {
    const configured = step.entries.filter((entry) => entry.channelName.trim() !== "").length;
    return configured > 0 ? `組み合わせ送信: ${configured} グループ` : "組み合わせ送信 (未設定)";
  },
  DetailPanel: CombinationSendMessageDetailPanel,
});
