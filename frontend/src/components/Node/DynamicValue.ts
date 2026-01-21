import z from "zod";

export const DynamicValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("literal"), value: z.string() }),
  z.object({ type: z.literal("session.name") }),
]);

export type DynamicValue = z.infer<typeof DynamicValueSchema>;

export const defaultDynamicValue = (): DynamicValue => ({
  type: "literal",
  value: "",
});

export function resolveDynamicValue(
  value: DynamicValue,
  context: { sessionName?: string },
): string {
  switch (value.type) {
    case "literal":
      return value.value;
    case "session.name":
      return context.sessionName ?? "";
    default:
      return "";
  }
}
