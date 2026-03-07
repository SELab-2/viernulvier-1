import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const enum ParseContext {
  Request,
  Database,
}

type ParseContextType = (typeof ParseContext)[keyof typeof ParseContext];

const parseErrors: Readonly<Record<ParseContextType, HttpError>> = {
  [ParseContext.Request]: new HttpError(400, "Invalid request data"),
  [ParseContext.Database]: new HttpError(500, "Internal server error"),
};

/**
 * Uses a zod schema to validate the params and returns them as an object.
 *
 * @param request - The Fastify request to extract params from.
 * @param schema - The parameter key to extract.
 * @returns The parameter value as a string.
 * @throws `Error` If params don't match the schema.
 */
export function parseParams<
  ParamType extends z.ZodRawShape,
  ParamSchema extends z.ZodObject<ParamType>,
>(request: FastifyRequest, schema: ParamSchema): z.output<ParamSchema> {
  const parsed = schema.safeParse(request.params);
  request.log.error(parsed.error);
  if (!parsed.success) throw new HttpError(400, "Invalid params");
  return parsed.data;
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
export function parse<ResultSchema extends z.ZodType>(
  server: FastifyInstance,
  schema: ResultSchema,
  value: unknown,
  context: ParseContextType = ParseContext.Request,
): z.output<ResultSchema> {
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
export function parseFirstRow<
  ResultType extends z.ZodRawShape,
  ResultSchema extends z.ZodObject<ResultType>,
>(
  server: FastifyInstance,
  schema: ResultSchema,
  rows: unknown[],
): z.output<ResultSchema> | null {
  if (rows.length === 0) return null;
  return parse(server, schema, rows[0], ParseContext.Database);
}

export function buildQuery<
  FilterFields extends z.ZodTuple,
  ResultType extends z.ZodRawShape,
  ResultSchema extends z.ZodObject<ResultType>,
>(
  server: FastifyInstance,
  queryConfig: Parameters<typeof server.pg.query>[0],
  filterFields: FilterFields,
  resultSchema: ResultSchema,
): (
  ...values: z.infer<FilterFields>
) => Promise<z.output<z.ZodArray<ResultSchema>>> {
  return async (...values: z.infer<FilterFields>) => {
    const parsed = filterFields.safeParse(values);
    if (!parsed.success) {
      server.log.error(parsed.error);
      throw parseErrors[ParseContext.Request];
    }
    let res;
    try {
      res = await server.pg.query(queryConfig, parsed.data as unknown[]);
    } catch (err) {
      server.log.error(err);
      throw parseErrors[ParseContext.Database];
    }
    return parse(server, z.array(resultSchema), res);
  };
}

/**
 * Wraps a handler function and sends a 404 response if the result is null.
 * Catches HttpErrors and forwards their status code and message.
 *
 * @param server - The Fastify instance, used for route registration.
 * @param handler - The handler function to wrap.
 * @returns A Fastify route handler.
 */
export function replyHandler<T extends z.ZodRawShape, Z extends z.ZodObject<T>>(
  server: FastifyInstance,
  handler: (
    server: FastifyInstance,
    reply: FastifyRequest,
  ) => Promise<Z | null>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await handler(server, request, reply);
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
export function getMetadata(request: FastifyRequest) {
  const payload = request.user as { id: number };
  return {
    admin: payload.id,
    current_time: new Date(),
  };
}
