import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { z } from "zod";

/**
 * Type for handler input with JSON body
 */
type JsonInput<T> = {
  in: {
    json: T;
  };
};

/**
 * Creates a JSON handler with Zod validation.
 * Returns both the validator middleware and the handler function.
 *
 * @example
 * const schema = z.object({ name: z.string() });
 *
 * export const { validator, handler } = defineJsonHandler(schema, async (data, c) => {
 *   // data is fully typed based on schema
 *   return c.json({ name: data.name });
 * });
 */
export function defineJsonHandler<
  T extends z.ZodObject<z.ZodRawShape>,
  R,
>(
  schema: T,
  fn: (data: z.infer<T>, c: Context) => R | Promise<R>,
) {
  type Data = z.infer<T>;

  const validator = zValidator("json", schema);

  const handler = async (c: Context<any, any, JsonInput<Data>>) => {
    const data = await c.req.json<Data>();
    return fn(data, c);
  };

  return { validator, handler };
}
