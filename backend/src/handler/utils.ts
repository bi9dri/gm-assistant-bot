import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { z } from "zod";

/**
 * Type for handler input with JSON body
 */
export type JsonInput<T extends z.ZodObject<z.ZodRawShape>> = {
  in: {
    json: z.infer<T>;
  };
};

/**
 * Creates a JSON body validator from a Zod schema
 */
export const createJsonValidator = <T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
) => zValidator("json", schema);

/**
 * Helper to get typed JSON data from request context
 */
export const getJsonData = <T extends z.ZodObject<z.ZodRawShape>>(
  c: Context<any, any, JsonInput<T>>,
) => c.req.json<z.infer<T>>();
