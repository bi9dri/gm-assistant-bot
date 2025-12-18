import type { Context } from "hono";
import type { Env } from "../env";

/**
 * Context type for handlers with JSON body validation.
 * Use with c.req.valid("json") to get typed request data.
 *
 * @example
 * const schema = z.object({ name: z.string() });
 * export const validator = zValidator("json", schema);
 * export const handler = async (c: JsonContext<z.infer<typeof schema>>) => {
 *   const data = c.req.valid("json");
 *   return c.json({ name: data.name });
 * };
 */
export type JsonContext<T> = Context<
  { Bindings: Env },
  string,
  { in: { json: T }; out: { json: T } }
>;
