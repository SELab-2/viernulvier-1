import type { FastifyInstance, FastifyRequest } from "fastify";
import type { z } from "zod";

/**
 * Extracts a typed parameter from a Fastify request.
 * Throws an error if the parameter is not present.
 *
 * @param request - The Fastify request to extract params from.
 * @param key - The parameter key to extract.
 * @returns The parameter value as a string.
 * @throws {Error} If the parameter is not present in the request.
 */
export function getParam(request: FastifyRequest, key: string): string {
  const value = (request.params as Record<string, string>)[key];
  if (value === undefined) throw new Error(`Missing route parameter: "${key}"`);
  return value;
}

/**
 * Parses an unknown value against a Zod schema.
 * On failure, logs the validation error and returns `null` instead of throwing.
 *
 * @param server - The Fastify instance, used for error logging.
 * @param schema - The Zod schema to validate and parse the value against.
 * @param value - The raw value to parse.
 * @returns The parsed and typed value, or `null` if validation failed.
 *
 * @internal
 */
export function safeParse<T>(server: FastifyInstance, schema: z.ZodType<T>, value: unknown): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    server.log.error(parsed.error);
    return null;
  }
  return parsed.data;
}

/**
 * Parses the first row of a query result against a Zod schema.
 * Returns `null` if no rows were returned or parsing failed.
 *
 * @param server - The Fastify instance, used for error logging.
 * @param schema - The Zod schema to validate and parse the row against.
 * @param rows - The array of rows returned from a database query.
 * @returns The parsed and typed value, or `null` if not found or validation failed.
 *
 * @internal
 */
export function parseFirstRow<T>(server: FastifyInstance, schema: z.ZodType<T>, rows: unknown[]): T | null {
  if (rows.length === 0) return null;
  return safeParse(server, schema, rows[0]);
}