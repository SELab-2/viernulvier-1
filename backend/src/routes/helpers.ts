import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

/* eslint-disable no-unused-vars */
export enum HttpClientError {
  BadRequest = 400,
  NotFound = 404,
}

export enum HttpServerError {
  InternalServerError = 500,
}

export enum HttpSuccess {
  OK = 200,
}

export type HTTPErrorCode =
  | HttpClientError
  | HttpServerError
  | HttpSuccess;

export class HttpError extends Error {
  constructor(public status: HTTPErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const enum ParseContext {
  Request,
  Database,
}

const parseErrors = {
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
 * Validate request params using Zod
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

/**
 * Validate any value using a Zod schema
 */
export function parseSchema<ResultSchema extends z.ZodType>(
  server: FastifyInstance,
  schema: ResultSchema,
  value: unknown,
  context: ParseContext = ParseContext.Request,
): z.output<ResultSchema> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    server.log.error(parsed.error);
    throw parseErrors[context];
  }

  return parsed.data;
}

/**
 * Wrap route handlers with standard response behaviour
 */
export function replyHandler(
  server: FastifyInstance,
  handler: (
    server: FastifyInstance,
    request: FastifyRequest,
    reply?: FastifyReply,
  ) => Promise<unknown | null>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await handler(server, request, reply);

      if (!result) {
        throw new HttpError(HttpClientError.NotFound, "Not Found");
      }

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
 * Metadata helper for DB fields
 * Authentication not merged yet → admin hardcoded
 */
export function getMetadata(_request?: FastifyRequest) {
  return {
    admin: 0,
    current_time: new Date(),
  };
}