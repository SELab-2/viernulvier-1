import { primaryKey } from "@viernulvier/shared/types/helpers.js";
import {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import type { QueryResult } from "pg";
import { z } from "zod";

export enum HttpInformation {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  EarlyHints = 103,
}

export enum HttpSuccess {
  OK = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  IMUsed = 226,
}

export enum HttpRedirect {
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
}

export enum HttpClientError {
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  UriTooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  ImATeapot = 418,
  MisdirectedRequest = 421,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
}

export enum HttpServerError {
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HttpVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

export type HTTPErrorCode =
  | HttpInformation
  | HttpSuccess
  | HttpRedirect
  | HttpClientError
  | HttpServerError;

export class HttpError extends Error {
  constructor(
    public status: HTTPErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const enum ParseContext {
  Request,
  Database,
}

type ParseContextType = (typeof ParseContext)[keyof typeof ParseContext];

const parseErrors: Readonly<Record<ParseContextType, HttpError>> = {
  [ParseContext.Request]: new HttpError(
    HttpClientError.BadRequest,
    "Invalid request data",
  ),
  [ParseContext.Database]: new HttpError(
    HttpServerError.InternalServerError,
    "Internal server error",
  ),
};

/**
 * Uses a zod schema to validate the params and returns them as an object.
 *
 * @usage `const { id } = parseParams(request, z.object({ id: stringToInt() }))`
 *
 * Remember that all params are strings and thus must be converted to the right data type
 * with a codec. {@linkplain https://zod.dev/codecs}
 * @param request - The Fastify request to extract parameters from.
 * @param schema - The schema to ber used to validate the parameters.
 * @returns A type safe object where all required params have been validated.
 * @throws - {@link HttpError} If parameters don't match the schema.
 */
export function parseParams<
  ParamType extends z.ZodRawShape,
  ParamSchema extends z.ZodObject<ParamType>,
>(request: FastifyRequest, schema: ParamSchema): z.output<ParamSchema> {
  const parsed = schema.safeParse(request.params);
  if (!parsed.success) {
    request.log.error(parsed.error);
    throw parseErrors[ParseContext.Request];
  }
  return parsed.data;
}
// Coverage ignore as it is being deprecated.
/* v8 ignore start */
/**
 * @deprecated Please use {@link parseParams()} instead.
 *
 * @param request - The Fastify request to extract params from.
 * @param key - The parameter key to extract.
 * @returns The parameter value as a string.
 * @throws `Error` if the parameter is not present in the request.
 */
export function getParam(request: FastifyRequest, key: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const value = (request.params as Record<string, string>)[key];
  if (value === undefined)
    throw new HttpError(400, `Missing route parameter: "${key}"`);
  return value;
}
/* v8 ignore stop */

/**
 * Parses an unknown value against a Zod schema.
 * On failure, logs the validation error and throws an HttpError.
 *
 * @param server - The Fastify instance, used for error logging.
 * @param schema - The Zod schema to validate and parse the value against.
 * @param value - The raw value to parse.
 * @param context - The context in which the parse is happening, used to determine the error response.
 * @returns The parsed and typed value.
 * @throws - {@link HttpError} if validation failed.
 *
 * @internal
 */
export function parseSchema<ResultSchema extends z.ZodType>(
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

// Coverage ignore as it is being deprecated.
/* v8 ignore start */
/**
 *  @deprecated currently just an alias for {@link parseSchema}, I suggest using that instead
 */
export const parse = parseSchema;
/* v8 ignore stop */

// Coverage ignore as it is being deprecated
/* v8 ignore start */
/**
 * @deprecated please use {@link buildQuery()} instead
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
  return parseSchema(server, schema, rows[0], ParseContext.Database);
}
/* v8 ignore stop */

/**
 * Helper function that adds data validation to both the input and output of a db query.
 *
 * @param {FastifyInstance} server - The fastify server instance to be used to report errors.
 * @param {Parameters<typeof server.pg.query>[0]} queryConfig - Any query config supported by `server.pg.query`
 * @param {ResultSchema} resultSchema - The schema that will be used to validate the data retrieved from the query. This is automatically wrapped in `z.array()`
 * @return {*} A query that can then be executed returning a promise with type safe and validated results.
 * @throws - {@link HttpError} on either a database error or a validation error. Logs the details.
 */
export function buildQuery<
  ResultType extends z.ZodRawShape,
  ResultSchema extends z.ZodObject<ResultType>,
>(
  server: FastifyInstance,
  queryConfig: Parameters<typeof server.pg.query>[0],
  resultSchema: ResultSchema,
): () => Promise<z.output<z.ZodArray<ResultSchema>>>;
/**
 * Helper function that adds data validation to both the input and output of a db query.
 *
 * @param {FastifyInstance} server - The fastify server instance to be used to report errors.
 * @param {Parameters<typeof server.pg.query>[0]} queryConfig - Any query config supported by `server.pg.query`
 * @param {FilterFields} filterFields - A ZodTuple that specifies which types the values going into the query should have.
 * @param {ResultSchema} resultSchema - The schema that will be used to validate the data retrieved from the query. This is automatically wrapped in `z.array()`
 * @returns A query that can then be executed by supplying the needed parameters.
 * @throws Http error on either a database error or a validation error. Logs the details.
 */
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
) => Promise<z.output<z.ZodArray<ResultSchema>>>;
export function buildQuery<
  FilterFields extends z.ZodTuple,
  ResultType extends z.ZodRawShape,
  ResultSchema extends z.ZodObject<ResultType>,
>(
  server: FastifyInstance,
  queryConfig: Parameters<typeof server.pg.query>[0],
  filterFieldsOrResultSchema: FilterFields | ResultSchema,
  resultSchema?: ResultSchema,
) {
  const filterFields = (
    resultSchema ? filterFieldsOrResultSchema : z.tuple([])
  ) as FilterFields;
  resultSchema = resultSchema ?? (filterFieldsOrResultSchema as ResultSchema);
  return async (...values: z.infer<FilterFields>) => {
    const parsed = filterFields.safeParse(values);
    if (!parsed.success) {
      server.log.error(parsed.error);
      throw parseErrors[ParseContext.Request];
    }
    let res: QueryResult<z.output<ResultSchema>>;
    try {
      res = await server.pg.query<z.output<ResultSchema>>(
        queryConfig,
        parsed.data as unknown[],
      );
    } catch (err) {
      server.log.error(err);
      throw parseErrors[ParseContext.Database];
    }
    return parseSchema(
      server,
      z.array(resultSchema),
      res.rows,
      ParseContext.Database,
    );
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
export function replyHandler<Z extends z.ZodType>(
  server: FastifyInstance,
  handler: (
    server: FastifyInstance,
    request: FastifyRequest,
    reply?: FastifyReply,
  ) => Promise<z.output<Z> | null>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await handler(server, request, reply);
      if (!result) throw new HttpError(HttpClientError.NotFound, "Not Found");
      return await reply.status(HttpSuccess.OK).send({
        body: result,
      });
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
  const payload = z.object({ id: primaryKey() }).parse(request.user);
  return {
    admin: payload.id,
    current_time: new Date(),
  };
}
