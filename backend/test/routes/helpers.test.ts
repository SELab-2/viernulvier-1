import {
  HttpError,
  ValidationError,
  parseSchema,
  parseParams,
  parseUser,
  ParseContext,
  HttpClientError,
  HttpServerError,
  buildQuery,
  replyHandler,
  type HTTPErrorCode,
  HttpSuccess,
} from "@/routes/helpers.js";
import { serial, stringToSerial } from "@viernulvier/shared/types/helpers.js";
import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { afterEach } from "node:test";
import { describe, test, expect, vi, beforeEach } from "vitest";
import z from "zod";

describe(HttpError, () => {
  describe("Instantiating with a correct Error Code.", () => {
    test("new HttpError(500, 'Example Error')", () => {
      const err = vi.fn(HttpError);
      const errObj = new err(500, "Example Error");
      expect(err, "should return normally").toHaveReturned();

      expect(errObj.message, "should contain the error message provided").toBe(
        "Example Error",
      );
      expect(errObj.status, "should have the correct status code").toBe(500);
      expect(errObj.name, "should be an instance of ").toBe("HttpError");
    });
  });
});

describe(parseParams, () => {
  const generateExampleRequest = (params?: Record<string, string>) =>
    ({
      params: params ?? {},
      log: { error: vi.fn() },
    }) as unknown as FastifyRequest;

  describe("Parsing a request empty param object {}", () => {
    let exampleRequest: FastifyRequest;

    beforeEach(() => {
      exampleRequest = generateExampleRequest();
    });

    test("parseParams(request, z.object())", () => {
      expect(() => parseParams(exampleRequest, z.object())).not.toThrow();
      expect(parseParams(exampleRequest, z.object())).toStrictEqual({});

      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });

    test("parseParams(request, z.object({ id: z.int() }))", () => {
      expect(() =>
        parseParams(exampleRequest, z.object({ id: z.int() })),
      ).toThrow(HttpError);
      expect(exampleRequest.log.error).toHaveBeenCalledWith(
        z.object({ id: z.int() }).safeParse({}).error,
      );
    });
  });

  describe("Parsing a request with a single string value {id: '100'}", () => {
    let params: Record<string, string>;
    let exampleRequest: FastifyRequest;

    beforeEach(() => {
      params = {
        id: "100",
      };
      exampleRequest = generateExampleRequest(params);
    });

    test("parseParams(request, z.object())", () => {
      expect(() => parseParams(exampleRequest, z.object())).not.toThrow();
      expect(parseParams(exampleRequest, z.object())).toStrictEqual({});
      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });

    test("parseParams(request, z.strictObject({}))", () => {
      expect(() => parseParams(exampleRequest, z.strictObject({}))).toThrow(
        HttpError,
      );
      expect(exampleRequest.log.error).toHaveBeenCalledWith(
        z.strictObject({}).safeParse(params).error,
      );
    });

    test("parseParams(request, z.object({ id: z.int() }))", () => {
      expect(() =>
        parseParams(exampleRequest, z.object({ id: z.int() })),
      ).toThrow(HttpError);
      expect(exampleRequest.log.error).toHaveBeenCalledWith(
        z.object({ id: z.int() }).safeParse(params).error,
      );
    });

    test("parseParams(request, z.object({ id: stringToSerial }))", () => {
      expect(() =>
        parseParams(exampleRequest, z.object({ id: stringToSerial })),
      ).not.toThrow();
      expect(
        parseParams(exampleRequest, z.object({ id: stringToSerial })),
      ).toStrictEqual({
        id: 100,
      });
      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });
  });

  describe("Parsing a request with a multiple string values {id: '100', name: 'bob', food: 'cake'}", () => {
    let params: Record<string, string>;
    let exampleRequest: FastifyRequest;

    beforeEach(() => {
      params = {
        id: "100",
        name: "bob",
        food: "cake",
      };
      exampleRequest = generateExampleRequest(params);
    });

    test("parseParams(request, z.object())", () => {
      const schema = z.object();
      expect(() => parseParams(exampleRequest, schema)).not.toThrow();
      expect(parseParams(exampleRequest, schema)).toStrictEqual({});
      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });

    test("parseParams(request, z.strictObject({}))", () => {
      const schema = z.strictObject({});
      expect(() => parseParams(exampleRequest, schema)).toThrow(HttpError);
      expect(exampleRequest.log.error).toHaveBeenCalledWith(
        schema.safeParse(params).error,
      );
    });

    test("parseParams(request, z.object({ id: z.int() }))", () => {
      const schema = z.object({ id: z.int() });
      expect(() => parseParams(exampleRequest, schema)).toThrow(HttpError);
      expect(exampleRequest.log.error).toHaveBeenCalledWith(
        schema.safeParse(params).error,
      );
    });

    test("parseParams(request, z.object({ id: stringToSerial }))", () => {
      const schema = z.object({ id: stringToSerial });
      expect(() => parseParams(exampleRequest, schema)).not.toThrow();
      expect(parseParams(exampleRequest, schema)).toStrictEqual({
        id: 100,
      });
      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });

    test("parseParams(request, z.strictObject({ id: stringToSerial }))", () => {
      const schema = z.strictObject({ id: stringToSerial });
      expect(() => parseParams(exampleRequest, schema)).toThrow();
      expect(exampleRequest.log.error).toHaveBeenCalledWith(
        schema.safeParse(params).error,
      );
    });

    test("parseParams(request, z.object({ name: z.string().max(10) }))", () => {
      const schema = z.object({ name: z.string().max(10) });
      expect(() => parseParams(exampleRequest, schema)).not.toThrow();
      expect(parseParams(exampleRequest, schema)).toStrictEqual({
        name: "bob",
      });
      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });

    test(`parseParams(request, z.strictObject({
                id: stringToSerial,
                name: z.string().max(10),
                food: z.string().max(32)
            }))`, () => {
      const schema = z.strictObject({
        id: stringToSerial,
        name: z.string().max(10),
        food: z.string().max(32),
      });
      expect(() => parseParams(exampleRequest, schema)).not.toThrow();
      expect(parseParams(exampleRequest, schema)).toStrictEqual({
        id: 100,
        name: "bob",
        food: "cake",
      });
      expect(exampleRequest.log.error).not.toHaveBeenCalled();
    });
  });
});

describe(parseUser, () => {
  const defaultUser = {id: 404, username: "Karel"};

  const generateExampleRequest = (user?: Record<string, string>) =>
    ({
      user: user ?? defaultUser,
      log: { error: vi.fn() },
    }) as unknown as FastifyRequest;

  test("Success", () => {
    const user = parseUser(generateExampleRequest());
    expect(user).toEqual(defaultUser);
  });

  test("Error", () => {
    expect(() => parseUser(generateExampleRequest({ id: "not a number", username: "" }))).toThrow("Invalid request data");
  });
});

describe(parseSchema, () => {
  const generateMockServer = () =>
    ({
      log: { error: vi.fn() },
    }) as unknown as FastifyInstance;
  let MockServer: ReturnType<typeof generateMockServer>;
  beforeEach(() => {
    MockServer = generateMockServer();
  });

  const errorContexts = {
    "ParseContext.Request": {
      idx: ParseContext.Request,
      err: ValidationError,
    },
    "ParseContext.Database": {
      idx: ParseContext.Database,
      err: new HttpError(
        HttpServerError.InternalServerError,
        "Internal server error",
      ),
    },
  };
  let schema: z.ZodObject = z.object();
  const expectedParseErrors = (value: object) => schema.safeParse(value).error;

  for (const [ctx, { idx, err }] of Object.entries(errorContexts)) {
    describe(`Parsing in a ${ctx} context`, () => {
      describe("Parsing an empty schema: z.object({})", () => {
        beforeEach(() => {
          schema = z.object({});
        });

        test(`parseSchema(server, schema, {}, ${ctx})`, () => {
          expect(parseSchema(MockServer, schema, {}, idx)).toStrictEqual({});
          expect(MockServer.log.error).not.toHaveBeenCalled();
        });

        test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
          expect(
            parseSchema(MockServer, schema, { id: 100 }, idx),
          ).toStrictEqual({});
          expect(MockServer.log.error).not.toHaveBeenCalled();
        });

        test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
          expect(
            parseSchema(MockServer, schema, { name: "blah" }, idx),
          ).toStrictEqual({});
          expect(MockServer.log.error).not.toHaveBeenCalled();
        });
      });

      describe("Parsing a strict empty schema: z.strictObject({})", () => {
        beforeEach(() => {
          schema = z.strictObject({});
        });

        test(`parseSchema(server, schema, {}, ${ctx})`, () => {
          expect(parseSchema(MockServer, schema, {}, idx)).toStrictEqual({});
          expect(MockServer.log.error).not.toHaveBeenCalled();
        });

        test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
          expect(() =>
            parseSchema(MockServer, schema, { id: 100 }, idx),
          ).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(
            expectedParseErrors({ id: 100 }),
          );
        });

        test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
          expect(() =>
            parseSchema(MockServer, schema, { name: "blah" }, idx),
          ).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(
            expectedParseErrors({ name: "blah" }),
          );
        });
      });

      describe("Parsing a schema with an integer id field: z.strictObject({id: z.int()})", () => {
        beforeEach(() => {
          schema = z.strictObject({ id: z.int() });
        });

        test(`parseSchema(server, schema, {}, ${ctx})`, () => {
          expect(() => parseSchema(MockServer, schema, {}, idx)).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(expectedParseErrors({}));
        });

        test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
          expect(
            parseSchema(MockServer, schema, { id: 100 }, idx),
          ).toStrictEqual({
            id: 100,
          });
          expect(MockServer.log.error).not.toHaveBeenCalled();
        });

        test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
          expect(() =>
            parseSchema(MockServer, schema, { name: "blah" }, idx),
          ).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(
            expectedParseErrors({ name: "blah" }),
          );
        });
      });

      describe(`Parsing a schema with multiple fields: z.object({
                        id: serial(),
                        name: z.string().max(32),
                        friends: z.array(z.int())
                })`, () => {
        beforeEach(() => {
          schema = z.object({
            id: serial(),
            name: z.string().max(32),
            friends: z.array(z.int()),
          });
        });

        test(`parseSchema(server, schema, {}, ${ctx})`, () => {
          expect(() => parseSchema(MockServer, schema, {}, idx)).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(expectedParseErrors({}));
        });

        test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
          expect(() =>
            parseSchema(MockServer, schema, { id: 100 }, idx),
          ).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(
            expectedParseErrors({ id: 100 }),
          );
        });

        test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
          expect(() =>
            parseSchema(MockServer, schema, { name: "blah" }, idx),
          ).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(
            expectedParseErrors({ name: "blah" }),
          );
        });

        test(`parseSchema(server, schema, {name: 'blah', id: 100}, ${ctx})`, () => {
          expect(() =>
            parseSchema(MockServer, schema, { name: "blah", id: 100 }, idx),
          ).toThrow(err);
          expect(MockServer.log.error).toHaveBeenCalledWith(
            expectedParseErrors({ name: "blah", id: 100 }),
          );
        });

        test(`parseSchema(server, schema, {name: 'blah', id: 100, friends: []}, ${ctx})`, () => {
          expect(
            parseSchema(
              MockServer,
              schema,
              { name: "blah", id: 100, friends: [] },
              idx,
            ),
          ).toStrictEqual({ name: "blah", id: 100, friends: [] });
          expect(MockServer.log.error).not.toHaveBeenCalled();
        });
      });
    });
  }
});

// This test suite assumes the queries succeed and only checks
// that the data is validated.
describe(buildQuery, () => {
  const generateMockServer = <T extends object>(
    DBSetup?: T[],
    {
      filterExp,
      selectedFields,
    }: {
      filterExp?: (obj: T, ...values: unknown[]) => boolean;
      selectedFields?: string[];
    } = {},
  ) =>
    ({
      log: { error: vi.fn() },
      pg: {
        query: vi.fn().mockImplementation((_, values) => ({
          rows: (DBSetup ?? [])
            .filter((obj) => (filterExp ? filterExp(obj, ...values) : true))
            .map((obj) =>
              selectedFields
                ? Object.fromEntries(
                  Object.entries(obj).filter(([key]) =>
                    selectedFields.includes(key),
                  ),
                )
                : obj,
            ),
        })),
      },
    }) as unknown as FastifyInstance;
  let MockServer: ReturnType<typeof generateMockServer>;

  describe("Empty return from db: []", () => {
    beforeEach(() => {
      MockServer = generateMockServer();
    });
    describe("No filter fields given eg: SELECT * FROM productions", () => {
      test("buildQuery(server, queryString, z.object())", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions",
          z.object(),
        );
        expect(await query()).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions",
          z.tuple([]).parse([]),
        );
      });

      test("buildQuery(server, queryString, z.object(id: z.int()))", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions",
          z.object({ id: z.int() }),
        );
        expect(await query()).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions",
          z.tuple([]).parse([]),
        );
      });

      test("buildQuery(server, queryString, z.object({name: z.string().max(32)}))", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions",
          z.object({ name: z.string().max(32) }),
        );
        expect(await query()).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions",
          z.tuple([]).parse([]),
        );
      });
    });

    // For these tests I'm gonna assume that the tuple given through matches what the querystring specifies
    // And seeing as ts's type checker won't then let u anything but the correct values to the query
    // u can assure correctness.
    describe("With filter on an integer id eg: SELECT * FROM productions WHERE id = $1", () => {
      test("buildQuery(server, queryString, z.tuple([z.int()]), z.object())", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions WHERE id = $1",
          z.tuple([z.int()]),
          z.object(),
        );
        expect(await query(50)).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions WHERE id = $1",
          z.tuple([z.int()]).parse([50]),
        );
      });

      test("buildQuery(server, queryString, z.tuple([z.int()]), z.object({name: z.string().max(32)})", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions WHERE id = $1",
          z.tuple([z.int()]),
          z.object({ name: z.string().max(32) }),
        );
        expect(await query(50)).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions WHERE id = $1",
          z.tuple([z.int()]).parse([50]),
        );
      });

      test("buildQuery(server, queryString, z.tuple([z.int()]), z.object({id: z..int()})", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions WHERE id = $1",
          z.tuple([z.int()]),
          z.object({ name: z.int() }),
        );
        expect(await query(50)).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions WHERE id = $1",
          z.tuple([z.int()]).parse([50]),
        );
      });
    });

    describe("With multi filters of different types eg: SELECT * FROM productions WHERE id = $1, name = $2", () => {
      test("buildQuery(server, queryString, z.tuple([z.int(), z.string()]), z.object())", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions WHERE id = $1, name = $2",
          z.tuple([z.int(), z.string()]),
          z.object(),
        );
        expect(await query(50, "Noah")).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions WHERE id = $1, name = $2",
          z.tuple([z.int(), z.string()]).parse([50, "Noah"]),
        );
      });

      test("buildQuery(server, queryString, z.tuple([z.int(), z.string()]), z.object({name: z.string().max(32)})", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions WHERE id = $1, name = $2",
          z.tuple([z.int(), z.string()]),
          z.object({ name: z.string().max(32) }),
        );
        expect(await query(50, "Simon")).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions WHERE id = $1, name = $2",
          z.tuple([z.int(), z.string()]).parse([50, "Simon"]),
        );
      });

      test("buildQuery(server, queryString, z.tuple([z.int()]), z.object({id: z..int()})", async () => {
        const query = buildQuery(
          MockServer,
          "SELECT * FROM productions WHERE id = $1, name = $2",
          z.tuple([z.int(), z.string()]),
          z.object({ name: z.int() }),
        );
        expect(await query(50, "Lex")).toStrictEqual([]);
        expect(MockServer.log.error).not.toHaveBeenCalled();
        expect(MockServer.pg.query).toHaveBeenCalledWith(
          "SELECT * FROM productions WHERE id = $1, name = $2",
          z.tuple([z.int(), z.string()]).parse([50, "Lex"]),
        );
      });
    });
  });
  const expectedErrors = {
    [ParseContext.Request]: expect.objectContaining({
      message: "Invalid request data",
      status: 400,
      name: "ValidationError",
    }),
    [ParseContext.Database]: new HttpError(
      HttpServerError.InternalServerError,
      "Internal server error",
    ),
  };
  describe(`Having the production rows: [
        {id: 1, name: 'Iker', good_dancer: true},
        {id: 2, name: 'Lex', good_dance: false},
        {id: 3, name: 'Noah', good_dancer: true},
        {id: 4, name: 'Simon', good_dancer: false},
        {id: 5, name: 'Lucas', good_dancer: true},
        {id: 6, name: 'Thibault', good_dancer: false},
        {id: 7, name: 'Trixie', good_dancer: true},
        ]`, () => {
    let DB: Record<string, unknown>[];
    beforeEach(() => {
      DB = [
        { id: 1, name: "Iker", good_dancer: true },
        { id: 2, name: "Lex", good_dancer: false },
        { id: 3, name: "Noah", good_dancer: true },
        { id: 4, name: "Simon", good_dancer: false },
        { id: 5, name: "Lucas", good_dancer: true },
        { id: 6, name: "Thibault", good_dancer: false },
        { id: 7, name: "Trixie", good_dancer: true },
      ];
    });
    describe("No filter fields given: eg SELECT * FROM productions", () => {
      describe("Selecting all fields: SELECT * FROM productions", () => {
        beforeEach(() => {
          MockServer = generateMockServer(DB);
        });
        test("buildQuery(server, queryString, z.object())", async () => {
          const query = buildQuery(
            MockServer,
            "SELECT * FROM productions",
            z.object(),
          );
          expect(await query()).toStrictEqual(DB.map(() => ({})));
          expect(MockServer.log.error).not.toHaveBeenCalled();
          expect(MockServer.pg.query).toHaveBeenCalledWith(
            "SELECT * FROM productions",
            z.tuple([]).parse([]),
          );
        });

        test("buildQuery(server, queryString, z.object(id: z.int()))", async () => {
          const query = buildQuery(
            MockServer,
            "SELECT * FROM productions",
            z.object({ id: z.int() }),
          );
          expect(await query()).toStrictEqual(
            DB.map((obj) => ({ id: obj["id"] })),
          );
          expect(MockServer.log.error).not.toHaveBeenCalled();
          expect(MockServer.pg.query).toHaveBeenCalledWith(
            "SELECT * FROM productions",
            z.tuple([]).parse([]),
          );
        });

        test("buildQuery(server, queryString, z.object({name: z.string().max(32)}))", async () => {
          const query = buildQuery(
            MockServer,
            "SELECT * FROM productions",
            z.object({ name: z.string().max(32) }),
          );
          expect(await query()).toStrictEqual(
            DB.map((obj) => ({ name: obj["name"] })),
          );
          expect(MockServer.log.error).not.toHaveBeenCalled();
          expect(MockServer.pg.query).toHaveBeenCalledWith(
            "SELECT * FROM productions",
            z.tuple([]).parse([]),
          );
        });
        // An example of something that would throw.
        test(
          "buildQuery(server, queryString, z.object({price: z.number().positive() }))",
          {},
          async () => {
            const query = buildQuery(
              MockServer,
              "SELECT * FROM productions",
              z.object({ price: z.number().positive() }),
            );

            try {
              await query();
              expect.fail();
            } catch (err) {
              expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
              expect(MockServer.log.error).toHaveBeenCalledWith(
                z
                  .array(z.object({ price: z.number().positive() }))
                  .safeParse(DB).error,
              );
              expect(MockServer.pg.query).toHaveBeenCalledWith(
                "SELECT * FROM productions",
                z.tuple([]).parse([]),
              );
            }
          },
        );
        // Example of how a strict object can be used to verify the state of the query.
        test(`buildQuery(server, queryString, z.strictObject({
                        id: z.int().positive(),
                        name: z.string().max(32)
                    }))`, async () => {
          const query = buildQuery(
            MockServer,
            "SELECT * FROM productions",
            z.strictObject({
              id: z.int().positive(),
              name: z.string().max(32),
            }),
          );
          try {
            await query();
            expect.fail();
          } catch (err) {
            expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
            expect(MockServer.log.error).toHaveBeenCalledWith(
              z
                .array(
                  z.strictObject({
                    id: z.int().positive(),
                    name: z.string().max(32),
                  }),
                )
                .safeParse(DB).error,
            );
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions",
              z.tuple([]).parse([]),
            );
          }
        });
        // Example of how all fields would properly be parsed
        test(`buildQuery(server, queryString, z.strictObject({
                        id: z.int().positive(),
                        name: z.string().max(32),
                        good_dancer: z.boolean()
                    }))`, async () => {
          const query = buildQuery(
            MockServer,
            "SELECT * FROM productions",
            z.strictObject({
              id: z.int().positive(),
              name: z.string().max(32),
              good_dancer: z.boolean(),
            }),
          );
          expect(await query()).toStrictEqual(DB);
          expect(MockServer.log.error).not.toHaveBeenCalled();
          expect(MockServer.pg.query).toHaveBeenCalledWith(
            "SELECT * FROM productions",
            z.tuple([]).parse([]),
          );
        });
      });
      describe("Selecting only the id field: SELECT id FROM productions", () => {
        let DBFiltered: typeof DB;
        beforeEach(() => {
          DBFiltered = DB.map((obj) => ({ id: obj["id"] }));
          MockServer = generateMockServer(DB, { selectedFields: ["id"] });
        });
        test("buildQuery(server, queryString, z.object())", async () => {
          const query = buildQuery(
            MockServer,
            "SELECT id FROM productions",
            z.object(),
          );
          expect(await query()).toStrictEqual(DB.map(() => ({})));
          expect(MockServer.log.error).not.toHaveBeenCalled();
          expect(MockServer.pg.query).toHaveBeenCalledWith(
            "SELECT id FROM productions",
            z.tuple([]).parse([]),
          );
        });

        test("buildQuery(server, queryString, z.object(id: z.int()))", async () => {
          const query = buildQuery(
            MockServer,
            "SELECT id FROM productions",
            z.object({ id: z.int() }),
          );
          expect(await query()).toStrictEqual(
            DB.map((obj) => ({ id: obj["id"] })),
          );
          expect(MockServer.log.error).not.toHaveBeenCalled();
          expect(MockServer.pg.query).toHaveBeenCalledWith(
            "SELECT id FROM productions",
            z.tuple([]).parse([]),
          );
        });

        test("buildQuery(server, queryString, z.object({name: z.string().max(32)}))", async () => {
          const query = buildQuery(
            MockServer,
            "SELECT id FROM productions",
            z.object({ name: z.string().max(32) }),
          );
          try {
            await query();
            expect.fail();
          } catch (err) {
            expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
            expect(MockServer.log.error).toHaveBeenCalledWith(
              z
                .array(z.object({ name: z.string().max(32) }))
                .safeParse(DBFiltered).error,
            );
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT id FROM productions",
              z.tuple([]).parse([]),
            );
          }
        });
        // This strict object will fail once more
        test(`buildQuery(server, queryString, z.strictObject({
                        id: z.int().positive(),
                        name: z.string().max(32)
                    }))`, async () => {
          const query = buildQuery(
            MockServer,
            "SELECT id FROM productions",
            z.strictObject({
              id: z.int().positive(),
              name: z.string().max(32),
            }),
          );
          try {
            await query();
            expect.fail();
          } catch (err) {
            expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
            expect(MockServer.log.error).toHaveBeenCalledWith(
              z
                .array(
                  z.strictObject({
                    id: z.int().positive(),
                    name: z.string().max(32),
                  }),
                )
                .safeParse(DBFiltered).error,
            );
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT id FROM productions",
              z.tuple([]).parse([]),
            );
          }
        });
        // And now this one will to as we only selected the id tho we were
        // expecting everything, even if the object isn't strict.
        test(`buildQuery(server, queryString, z.object({
                        id: z.int().positive(),
                        name: z.string().max(32),
                        good_dancer: z.boolean()
                    }))`, async () => {
          const query = buildQuery(
            MockServer,
            "SELECT id FROM productions",
            z.strictObject({
              id: z.int().positive(),
              name: z.string().max(32),
              good_dancer: z.boolean(),
            }),
          );
          try {
            await query();
            expect.fail();
          } catch (err) {
            expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
            expect(MockServer.log.error).toHaveBeenCalledWith(
              z
                .array(
                  z.strictObject({
                    id: z.int().positive(),
                    name: z.string().max(32),
                    good_dancer: z.boolean(),
                  }),
                )
                .safeParse(DBFiltered).error,
            );
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT id FROM productions",
              z.tuple([]).parse([]),
            );
          }
        });
      });
    });

    // Now Im gonna do some more fun and specific examples as we have pretty exhaustively
    // checked the basics.
    describe("With filter on an integer id eg: SELECT * FROM productions WHERE id = $1", () => {
      describe("Selecting all fields: SELECT * FROM productions WHERE id = $1", () => {
        beforeEach(() => {
          MockServer = generateMockServer(DB, {
            filterExp: (obj, id) => obj["id"] === id,
          });
        });
        describe("buildQuery(server, queryString, z.tuple([z.int().positive()]), z.object({id: z.int().positive()}))", () => {
          let query = buildQuery(
            MockServer,
            "SELECT * FROM productions WHERE id = $1",
            z.tuple([z.int().positive()]),
            z.object({ id: z.int().positive() }),
          );
          beforeEach(() => {
            query = buildQuery(
              MockServer,
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]),
              z.object({ id: z.int().positive() }),
            );
          });

          test("await query(1)", async () => {
            expect(await query(1)).toStrictEqual([{ id: 1 }]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([1]),
            );
          });

          test("await query(2)", async () => {
            expect(await query(2)).toStrictEqual([{ id: 2 }]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([2]),
            );
          });
          // Should return an empty row.
          test("await query(10)", async () => {
            expect(await query(10)).toStrictEqual([]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([10]),
            );
          });
          // Typechecker should normally prohibit this but in case an
          // unknown is input. Let's make sure it throws. And that
          // its a request based error. It should also never execute
          // the query.
          test("await query('1')", async () => {
            try {
              await query("1" as unknown as number);
              expect.fail();
            } catch (err) {
              expect(err).toStrictEqual(expectedErrors[ParseContext.Request]);
              expect(MockServer.log.error).toHaveBeenCalledWith(
                z.tuple([z.int().positive()]).safeParse(["1"]).error,
              );
              expect(MockServer.pg.query).not.toHaveBeenCalled();
            }
          });
        });

        describe(`buildQuery(
                    server, queryString,
                    z.tuple([z.int().positive()]),
                    z.strictObject({ id: z.int().positive(), name: z.string().max(32), good_dancer: z.boolean() })
                )`, () => {
          let query = buildQuery(
            MockServer,
            "SELECT * FROM productions WHERE id = $1",
            z.tuple([z.int().positive()]),
            z.strictObject({
              id: z.int().positive(),
              name: z.string().max(32),
              good_dancer: z.boolean(),
            }),
          );
          beforeEach(() => {
            query = buildQuery(
              MockServer,
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]),
              z.strictObject({
                id: z.int().positive(),
                name: z.string().max(32),
                good_dancer: z.boolean(),
              }),
            );
          });

          test("await query(1)", async () => {
            expect(await query(1)).toStrictEqual([DB[0]]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([1]),
            );
          });

          test("await query(2)", async () => {
            expect(await query(2)).toStrictEqual([DB[1]]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([2]),
            );
          });
          // Should return an empty row.
          test("await query(10)", async () => {
            expect(await query(10)).toStrictEqual([]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([10]),
            );
          });
          // Typechecker should normally prohibit this but in case an
          // unknown is input. Let's make sure it throws. And that
          // its a request based error. It should also never execute
          // the query.
          test("await query('1')", async () => {
            try {
              await query("1" as unknown as number);
              expect.fail();
            } catch (err) {
              expect(err).toStrictEqual(expectedErrors[ParseContext.Request]);
              expect(MockServer.log.error).toHaveBeenCalledWith(
                z.tuple([z.int().positive()]).safeParse(["1"]).error,
              );
              expect(MockServer.pg.query).not.toHaveBeenCalled();
            }
          });
        });

        // An example of something that will throw. Here the main important
        // thing to note is where it fails, before or after querying the db.
        // If the input params are wrong this fails before even trying to
        // execute the query.
        describe("buildQuery(server, queryString, z.object({price: z.number().positive() }))", () => {
          let query = buildQuery(
            MockServer,
            "SELECT * FROM productions WHERE id = $1",
            z.tuple([z.int().positive()]),
            z.object({ price: z.number().positive() }),
          );
          beforeEach(() => {
            query = buildQuery(
              MockServer,
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]),
              z.object({ price: z.number().positive() }),
            );
          });
          // Here we fail after retrieve the specified row from the db.
          test("await query(1)", async () => {
            try {
              await query(1);
              expect.fail();
            } catch (err) {
              expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
              expect(MockServer.log.error).toHaveBeenCalledWith(
                z
                  .array(z.object({ price: z.number().positive() }))
                  .safeParse([DB[0]]).error,
              );
              // Note we fail after this query is called.
              expect(MockServer.pg.query).toHaveBeenCalledWith(
                "SELECT * FROM productions WHERE id = $1",
                z.tuple([z.int().positive()]).parse([1]),
              );
            }
          });

          // Since we return an empty row this doesn't actually fail the validation,
          // which can be dangerous. This is an edge case with no good solution.
          // As long as the used schemas are correct it shouldn't matter.
          test("await query(10)", async () => {
            expect(await query(10)).toStrictEqual([]);
            expect(MockServer.log.error).not.toHaveBeenCalled();
            expect(MockServer.pg.query).toHaveBeenCalledWith(
              "SELECT * FROM productions WHERE id = $1",
              z.tuple([z.int().positive()]).parse([10]),
            );
          });
          // This is an example of something that we throw before even trying to execute
          // the query. That is because the data it was provided makes no sense in
          // the context of the query.
          test("await query('Trixie is cool!')", async () => {
            try {
              await query("Trixie is cool!" as unknown as number);
              expect.fail();
            } catch (err) {
              expect(err).toStrictEqual(expectedErrors[ParseContext.Request]);
              expect(MockServer.log.error).toHaveBeenCalledWith(
                z.tuple([z.int().positive()]).safeParse(["Trixie is cool!"])
                  .error,
              );
              // Note we expect this not to be called.
              expect(MockServer.pg.query).not.toHaveBeenCalled();
            }
          });
        });
      });
    });
  });

  describe("When the database throws an error", () => {
    beforeEach(() => {
      MockServer = {
        log: { error: vi.fn() },
        pg: {
          query: vi.fn().mockRejectedValue(new Error("Connection refused")),
        },
      } as unknown as FastifyInstance;
    });

    test("buildQuery(server, queryString, z.object()) rejects with a Database HttpError", async () => {
      const query = buildQuery(
        MockServer,
        "SELECT * FROM productions",
        z.object(),
      );
      try {
        await query();
        expect.fail();
      } catch (err) {
        expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
        expect(MockServer.log.error).toHaveBeenCalledWith(new Error("Connection refused"));
        expect(MockServer.pg.query).toHaveBeenCalled();
      }
    });

    test("buildQuery(server, queryString, z.tuple([z.int()]), z.object()) rejects with a Database HttpError", async () => {
      const query = buildQuery(
        MockServer,
        "SELECT * FROM productions WHERE id = $1",
        z.tuple([z.int()]),
        z.object(),
      );
      try {
        await query(1);
        expect.fail();
      } catch (err) {
        expect(err).toStrictEqual(expectedErrors[ParseContext.Database]);
        expect(MockServer.log.error).toHaveBeenCalledWith(new Error("Connection refused"));
        expect(MockServer.pg.query).toHaveBeenCalled();
      }
    });
  });
});

describe(replyHandler, () => {
  const generateMockServer = <T extends object>(
    DBSetup?: T[],
    {
      filterExp,
      selectedFields,
    }: {
      filterExp?: (obj: T, ...values: unknown[]) => boolean;
      selectedFields?: string[];
    } = {},
  ) =>
    ({
      log: { error: vi.fn() },
      pg: {
        query: vi.fn().mockImplementation((_, values) => ({
          rows: (DBSetup ?? [])
            .filter((obj) => (filterExp ? filterExp(obj, ...values) : true))
            .map((obj) =>
              selectedFields
                ? Object.fromEntries(
                  Object.entries(obj).filter(([key]) =>
                    selectedFields.includes(key),
                  ),
                )
                : obj,
            ),
        })),
      },
    }) as unknown as FastifyInstance;
  let mockServer: ReturnType<typeof generateMockServer>;
  const mockReply = {
    status: vi.fn().mockImplementation((status: HTTPErrorCode) => ({
      send: vi
        .fn()
        .mockImplementation(
          (members: { error?: string; message?: string; body: unknown }) => ({
            status,
            ...members,
          }),
        ),
    })),
  } as unknown as FastifyReply;
  const mockRequest = {} as unknown as FastifyRequest;

  afterEach(() => {
    vi.clearAllMocks();
  });
  describe("When given a basic handler that returns a null value: () => null", () => {
    beforeEach(() => {
      mockServer = generateMockServer();
    });
    const handler = vi.fn(async () => null);
    describe("const endpoint = replyHandler(server, handler)", async () => {
      const endpoint = await replyHandler(mockServer, handler);
      test("endpoint(request, reply)", async () => {
        const res = await endpoint(mockRequest, mockReply);
        expect(res).toStrictEqual({
          status: HttpClientError.NotFound,
          error: "Not Found",
        });
        expect(mockReply.status).toHaveBeenCalledWith(HttpClientError.NotFound);
      });
    });
  });

  describe("When given a handler that returns a valid value: () => {id: 1}", () => {
    beforeEach(() => {
      mockServer = generateMockServer();
    });
    const handler = vi.fn(async () => ({ id: 1 }));
    describe("const endpoint = replyHandler(server, handler)", async () => {
      const endpoint = replyHandler(mockServer, handler);
      test("endpoint(request, reply)", async () => {
        const res = await endpoint(mockRequest, mockReply);
        expect(res).toStrictEqual({
          status: HttpSuccess.OK,
          id: 1 ,
        });
        expect(mockReply.status).toHaveBeenCalledWith(HttpClientError.NotFound);
      });
    });
  });

  describe("When given a handler that throws a non-HttpError", () => {
    beforeEach(() => {
      mockServer = generateMockServer();
    });

    const unexpectedError = new Error("Unexpected failure");
    const handler = vi.fn(async () => {
      throw unexpectedError;
    });

    test("endpoint(request, reply) rethrows the error", async () => {
      const endpoint = replyHandler(mockServer, handler);
      await expect(endpoint(mockRequest, mockReply)).rejects.toThrow(unexpectedError);
    });
  });
});
