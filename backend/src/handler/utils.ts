import type { z } from "zod";

/**
 * Input type for handlers with JSON body validation.
 *
 * @example
 * const schema = z.object({ name: z.string() });
 * export const validator = zValidator("json", schema);
 * export const handler = async (c: Context<{}, string, JsonInput<typeof schema>>) => {
 *   const data = c.req.valid("json");
 * };
 */
export type JsonInput<T extends z.ZodType> = {
  in: { json: z.infer<T> };
  out: { json: z.infer<T> };
};
