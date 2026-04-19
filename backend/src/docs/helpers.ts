/**
 * This file contains helpers which are used to build OpenAPI documentation for our API endpoints.
 * The goal being to make them extendable and reusable.
 */
import { HttpClientError, HttpServerError, type HTTPErrorCode, type HttpSuccess } from "@/routes/helpers.js";
import { stringToInt } from "@viernulvier/shared/types/helpers.js";
import z from "zod";

type schemaDef = {
  body?: z.ZodType;
  params?: z.ZodType;
  response?: Partial<Record<HTTPErrorCode | "default", z.ZodType>>;
  querystring?: z.ZodType;
  default?: z.ZodType;
  description?: string;
  security?: Record<string, string[]>[];
  tags?: string[];
};

/**
 * Abstract base class for RequestSchema
 * @privateRemarks
 * - This adds support to extend an underlying json schema definition with a wrapper.
 * - Children of this class each determine a simple constructor that defines
 * a specific part of the schema.
 * @internal
 */
abstract class AbstractRequestSchema {
  private _schema: schemaDef;
  constructor(schema: schemaDef = {}) {
    this._schema = schema;
    return this;
  }

  protected extend(schema: schemaDef) {
    const newSchema = {
      ...this._schema,
      ...schema,
    };
    if (this._schema.response || schema.response) {
      newSchema.response = {
        ...this._schema.response,
        ...schema.response,
      };
    }
    if (this._schema.tags || schema.tags) {
      newSchema.tags = [...(this._schema.tags ?? []), ...(schema.tags ?? [])];
    }
    this._schema = newSchema;
    return this;
  }

  public get schema() {
    return this._schema;
  }
}

/**
 * This is a utility class meant as an easy way to combine multiple base parts.
 * The attributes are attributed in order and later schemas can override earlier schemas.
 * This is intentional to allow setting a default with the option of overriding it.
 */
export class CombinedRequestSchema extends AbstractRequestSchema {
  constructor(...requestSchemas: AbstractRequestSchema[]) {
    super()
    requestSchemas.forEach(requestSchema => this.extend(requestSchema.schema))
  }
}

/**
 * Used as a shortcut to get the schema out of a list of {@link AbstractRequestSchema | RequestSchema} class instances.
 *
 * @param requestSchemas - {@link AbstractRequestSchema | RequestSchema} instances which make up the whole schema.
 * @returns The json schema that fastify needs to for its open api definition.
 */
export function requestSchema(...requestSchemas: AbstractRequestSchema[]) {
  return new CombinedRequestSchema(...requestSchemas).schema;
}


/**
 * Creates a RequestSchema for a specific error message.
 * @remarks
 * - Used to define specific error message responses one might when executing a request.
 * @example
 * ```
 * const requestWithNotFoundError = new RequestErrorMessage(404, "Not Found")
 * ```
 */
export class RequestErrorMessage extends AbstractRequestSchema {
  constructor(statusCode: HttpServerError | HttpClientError, msg: string) {
    super({
      response: {
        [statusCode]: z.object({error: z.literal(msg)}),
      },
    })
  }
}

/**
 * Creates a RequestSchema to specify the tags the schema should have.
 * @remarks
 * - Multiple of these can be safely combined together. Removing a tag is not supported.
 * @example
 * ```
 * const requestWithUserTag = new RequestTag("user");
 * ```
 */
export class RequestTag extends AbstractRequestSchema {
  constructor(tag: string) {
    super({tags: [tag]})
  }
}

/**
 * Creates a RequestSchema to set the description for the request
 * @example
 * ```
 * const requestWithShortDescription = new RequestDescription("This request does nothing at all.");
 * ```
 */
export class RequestDescription extends AbstractRequestSchema {
  constructor(description: string) {
    super({description})
  }
}
/**
 * Creates a RequestSchema to set a response schema for the request.
 * @remarks
 * - The response must be a zod schema which is ued both for validation and for the description of each field.
 * - Multiple of these can be safely combined together.
 * - Removing a response is not supported.
 * @example
 * ```
 * const requestWithOKResponse = new RequestResponse(200, z.object({id: z.number()}));
 * ```
 */
export class RequestResponse extends AbstractRequestSchema {
  constructor(statusCode: HttpSuccess, responseSchema: z.ZodType, isDefault: boolean = false) {
    super({
      response: {
        [statusCode]: responseSchema,
      },
    })
    if (isDefault) {
      this.extend({
        response: {
          default: responseSchema,
        },
      })
    }
  }
}
/**
 * Creates a RequestSchema to set the request parameters for the request.
 * @remarks
 * - All params must be provided as a single zod schema which is used both for validation and for the description of each field.
 * - Combining this with a second instance of `RequestParams` will cause it to be overridden.
 * @example
 * ```
 * const requestWithIdParameter = new RequestParams(z.object({id: z.number()}));
 * ```
 */
export class RequestParams extends AbstractRequestSchema {
  constructor(paramSchema: z.ZodType) {
    super({params: paramSchema})
  }
}
/**
 * Creates a RequestSchema to set the request body for the request.
 * @remarks
 * - The body must be provided as a single zod schema which is used both for validation and for the description of each field.
 * - Combining this with a second instance of `RequestBody` will cause it to be overridden.
 * @example
 * ```
 * const requestWithNameInBody = new RequestBody(z.object({name: z.string()}));
 * ```
 */
export class RequestBody extends AbstractRequestSchema {
  constructor(bodySchema: z.ZodType) {
    super({body: bodySchema})
  }
}

export class RequestQueryString extends AbstractRequestSchema {
  constructor(queryStringSchema: z.ZodType) {
    super({querystring: queryStringSchema})
  }
}

export class RequestSecurity extends AbstractRequestSchema {
  constructor(securityName: string, scopes: string[] = []) {
    super({
      security: [
        {
          [securityName]: scopes,
        },
      ],
    })
  }
}


export const DefaultRequestErrorMessages = new CombinedRequestSchema(
  new RequestErrorMessage(HttpClientError.NotFound, "Not Found"),
  new RequestErrorMessage(HttpClientError.BadRequest, "Invalid request data"),
  new RequestErrorMessage(HttpServerError.InternalServerError, "Internal server error"),
);

export const requestById = new RequestParams(
  z.object({ id: stringToInt }),
);

export const protectedRequest = new RequestSecurity("Login Session");