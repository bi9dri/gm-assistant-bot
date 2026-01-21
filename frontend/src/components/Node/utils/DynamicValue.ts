import z from "zod";

export const DynamicValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("literal"), value: z.string() }),
  z.object({ type: z.literal("session.name") }),
  z.object({ type: z.literal("roleRef"), roleName: z.string() }),
  z.object({ type: z.literal("channelRef"), channelName: z.string() }),
  z.object({ type: z.literal("gameFlag"), flagKey: z.string() }),
]);

export type DynamicValue = z.infer<typeof DynamicValueSchema>;

export interface DynamicValueContext {
  sessionName?: string;
  roles?: Map<string, string>;
  channels?: Map<string, string>;
  gameFlags?: Record<string, string>;
}

export const defaultDynamicValue = (): DynamicValue => ({
  type: "literal",
  value: "",
});

export function resolveDynamicValue(value: DynamicValue, context: DynamicValueContext): string {
  switch (value.type) {
    case "literal":
      return value.value;
    case "session.name":
      return context.sessionName ?? "";
    case "roleRef":
      return context.roles?.get(value.roleName) ?? value.roleName;
    case "channelRef":
      return context.channels?.get(value.channelName) ?? value.channelName;
    case "gameFlag":
      return context.gameFlags?.[value.flagKey] ?? "";
    default:
      return "";
  }
}
