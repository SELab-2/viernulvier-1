import { AdminSchema } from "@viernulvier/shared/index.js";
import { primaryKey } from "@viernulvier/shared/types/helpers.js";
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export type TypedFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

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

export const NO_CONTENT = Symbol("NO_CONTENT");

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
    /** Optional machine-readable code included in JSON error responses when set. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class ValidationError extends HttpError {
  constructor(public details: z.core.$ZodIssue[]) {
    super(HttpClientError.BadRequest, "Bad Request");
    this.name = "ValidationError";
  }
}

export const enum ParseContext {
  Request,
  Database,
}

type ParseContextType = (typeof ParseContext)[keyof typeof ParseContext];

function createParseError(
  context: ParseContextType,
  error?: z.ZodError,
): HttpError {
  if (context === ParseContext.Request && error) {
    return new ValidationError(error.issues);
  }
  return new HttpError(
    HttpServerError.InternalServerError,
    "Internal server error",
  );
}
/**
 * Uses a zod schema to validate the params and returns them as an object.
 *
 * Example: `const { id } = parseParams(request, z.object({ id: serial() }))`
 *
 * Remember that all params are strings and thus must be converted to the right data type
 * with a codec. See https://zod.dev/codecs
 * @param request - The Fastify request to extract parameters from.
 * @param schema - The schema to be used to validate the parameters.
 * @returns A type safe object where all required params have been validated.
 * @throws `HttpError` If parameters don't match the schema.
 */
export function parseParams<
  ParamType extends z.ZodRawShape,
  ParamSchema extends z.ZodObject<ParamType>,
>(request: FastifyRequest, schema: ParamSchema): z.output<ParamSchema> {
  const parsed = schema.safeParse(request.params);
  if (!parsed.success) {
    request.log.error(parsed.error);
    throw createParseError(ParseContext.Request, parsed.error);
  }
  return parsed.data;
}

const UserPayloadSchema = AdminSchema.pick({ id: true });
type UserPayload = z.infer<typeof UserPayloadSchema>;

/**
 * Extracts and validates the JWT payload from the request, returning only `id`.
 *
 * Example: `const { id } = parseUser(request);`
 *
 * @param request - The Fastify request to extract the user payload from.
 * @returns A type-safe object containing only `id`.
 * @throws `HttpError` If the payload doesn't match the expected shape.
 */
export function parseUser(request: FastifyRequest): UserPayload {
  const parsed = UserPayloadSchema.safeParse(request.user);
  if (!parsed.success) {
    request.log.error(parsed.error);
    throw createParseError(ParseContext.Request, parsed.error);
  }
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
 * @throws {@link HttpError} if validation failed.
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
    throw createParseError(context, parsed.error);
  }
  return parsed.data;
}

/**
 * Helper function that adds data validation to both the input and output of a db query.
 *
 * @param server - The Fastify instance, used for error reporting.
 * @param queryConfig - Any query config supported by `server.pg.query`
 * @param resultSchema - The schema that will be used to validate the data retrieved from the query. This is automatically wrapped in `z.array()`
 * @returns A query that can then be executed returning a promise with type safe and validated results.
 * @throws `HttpError` on either a database error or a validation error. Logs the details.
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
 * @param server - The fastify server instance to be used to report errors.
 * @param queryConfig - Any query config supported by `server.pg.query`
 * @param filterFields - A ZodTuple that specifies which types the values going into the query should have.
 * @param resultSchema - The schema that will be used to validate the data retrieved from the query. This is automatically wrapped in `z.array()`
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
      throw createParseError(ParseContext.Request, parsed.error);
    }
    let res: QueryResult<z.output<ResultSchema>>;
    try {
      res = await server.pg.query<z.output<ResultSchema>>(
        queryConfig,
        parsed.data as unknown[],
      );
    } catch (err) {
      server.log.error(err);
      throw createParseError(ParseContext.Database);
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
    reply: FastifyReply,
  ) => Promise<z.output<Z> | typeof NO_CONTENT | null>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await handler(server, request, reply);
      if (result == NO_CONTENT)
        return await reply.status(HttpSuccess.NoContent).send();
      if (!result) throw new HttpError(HttpClientError.NotFound, "Not Found");

      return await reply
        .status(reply?.statusCode ?? HttpSuccess.OK)
        .send(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        return await reply
          .status(err.status)
          .send({ error: err.message, details: err.details });
      }
      if (err instanceof HttpError) {
        const payload =
          err.code !== undefined
            ? { error: err.message, code: err.code }
            : { error: err.message };
        return await reply.status(err.status).send(payload);
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
