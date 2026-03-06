import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ParseContext = {
  Request: "Request",
  Database: "Database",
} as const;

type ParseContextType = (typeof ParseContext)[keyof typeof ParseContext];

const parseErrors: Record<ParseContextType, HttpError> = {
  [ParseContext.Request]: new HttpError(400, "Invalid request data"),
  [ParseContext.Database]: new HttpError(500, "Internal server error"),
};

/**
 * Extracts a typed parameter from a Fastify request.
 * Throws an error if the parameter is not present.
 *
 * @param request - The Fastify request to extract params from.
 * @param key - The parameter key to extract.
 * @returns The parameter value as a string.
 * @throws `Error` If the parameter is not present in the request.
 */
export function getParam(request: FastifyRequest, key: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const value = (request.params as Record<string, string>)[key];
  if (value === undefined) throw new HttpError(400, `Missing route parameter: "${key}"`);
  return value;
}

/**
 * Parses an unknown value against a Zod schema.
 * On failure, logs the validation error and throws an HttpError.
 *
 * @param server - The Fastify instance, used for error logging.
 * @param schema - The Zod schema to validate and parse the value against.
 * @param value - The raw value to parse.
 * @param context - The context in which the parse is happening, used to determine the error response.
 * @returns The parsed and typed value.
 * @throws `HttpError` If validation failed.
 *
 * @internal
 */
export function safeParse<T>(
  server: FastifyInstance,
  schema: z.ZodType<T>,
  value: unknown,
  context: ParseContextType = ParseContext.Request
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    server.log.error(parsed.error);
    // eslint-disable-next-line security/detect-object-injection
    throw parseErrors[context];
  }
  return parsed.data;
}

/**
 * Parses the first row of a query result against a Zod schema.
 * Returns `null` if no rows were returned, throws an HttpError if parsing failed.
 *
 * @param server - The Fastify instance, used for error logging.
 * @param schema - The Zod schema to validate and parse the row against.
 * @param rows - The array of rows returned from a database query.
 * @returns The parsed and typed value, or `null` if not found.
 * @throws `HttpError` If validation failed.
 *
 * @internal
 */
export function parseFirstRow<T>(server: FastifyInstance, schema: z.ZodType<T>, rows: unknown[]): T | null {
  if (rows.length === 0) return null;
  return safeParse(server, schema, rows[0], ParseContext.Database);
}

/**
 * Wraps a handler function and sends a 404 response if the result is null.
 * Catches HttpErrors and forwards their status code and message.
 *
 * @param server - The Fastify instance, used for route registration.
 * @param handler - The handler function to wrap.
 * @returns A Fastify route handler.
 */
export function replyHandler<T>(
  server: FastifyInstance,
  handler: (server: FastifyInstance, reply: FastifyRequest) => Promise<T | null>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await handler(server, request);
      if (!result) throw new HttpError(404, "Not Found");
      return result;
    } catch (err) {
      if (err instanceof HttpError) {
        return await reply.status(err.status).send({ error: err.message });
      }
      throw err;
    }
  };
}

/**
 * Returns metadata for database operations.
 * Until authorization is implemented, `admin` is hardcoded to `0`.
 *
 * @returns An object containing the current admin ID and the current timestamp.
 */
export function getMetadata() {
  return {
    admin: 0,
    current_time: new Date(),
  };
}