import { HttpError, parseSchema, parseParams, ParseContext, HttpClientError, HttpServerError } from "@/routes/helpers.js";
import { serial, stringToSerial } from "@viernulvier/shared/types/helpers.js";
import { type FastifyInstance, type FastifyRequest } from "fastify";
import { describe, test, expect, vi, beforeEach } from "vitest";
import z from "zod";


describe(HttpError, () => {
    describe("Instantiating with a correct Error Code.", () => {
        test("new HttpError(500, 'Example Error')", () => {
            const err = vi.fn(HttpError);
            const errObj = new err(500, 'Example Error')
            expect(err, "should return normally").toReturn();

            expect(errObj.message, "should contain the error message provided").toBe("Example Error");
            expect(errObj.status, "should have the correct status code").toBe(500);
            expect(errObj.name, "should be an instance of ").toBe("HttpError");
        })
    })
});


describe(parseParams, () => {

    const generateExampleRequest = (params?: Record<string, string>) => ({
        params: params ?? {},
        log: { error: vi.fn() }
    } as unknown as FastifyRequest)

    describe("Parsing a request empty param object {}", () => {
        let exampleRequest: FastifyRequest;

        beforeEach(() => {
            exampleRequest = generateExampleRequest();
        })

        test("parseParams(request, z.object())", () => {
            expect(() => parseParams(exampleRequest, z.object())).not.toThrow();
            expect(parseParams(exampleRequest, z.object())).toStrictEqual({});

            expect(exampleRequest.log.error).not.toBeCalled();

        })

        test("parseParams(request, z.object({ id: z.int() }))", () => {
            expect(() => parseParams(exampleRequest, z.object({id: z.int()}))).toThrow(HttpError);
            expect(exampleRequest.log.error).toBeCalledWith(z.object({ id: z.int() }).safeParse({}).error)
        })
    })

    describe("Parsing a request with a single string value {id: '100'}", () => {
        let params: Record<string, string>;
        let exampleRequest: FastifyRequest;

        beforeEach(() => {
            params = {
                id: "100"
            }
            exampleRequest = generateExampleRequest(params);
        });

        test("parseParams(request, z.object())", () => {
            expect(() => parseParams(exampleRequest, z.object())).not.toThrow();
            expect(parseParams(exampleRequest, z.object())).toStrictEqual({});
            expect(exampleRequest.log.error).not.toBeCalled();
        });

        test("parseParams(request, z.strictObject({}))", () => {
            expect(() => parseParams(exampleRequest, z.strictObject({}))).toThrow(HttpError);
            expect(exampleRequest.log.error)
                .toBeCalledWith(z.strictObject({}).safeParse(params).error);
        })

        test("parseParams(request, z.object({ id: z.int() }))", () => {
            expect(() => parseParams(exampleRequest, z.object({ id: z.int() }))).toThrow(HttpError);
            expect(exampleRequest.log.error)
                .toBeCalledWith(z.object({ id: z.int() })
                    .safeParse(params).error);
        });

        test("parseParams(request, z.object({ id: stringToSerial }))", () => {
            expect(() => parseParams(exampleRequest, z.object({ id: stringToSerial }))).not.toThrow();
            expect(parseParams(exampleRequest, z.object({ id: stringToSerial }))).toStrictEqual({
                id: 100
            })
            expect(exampleRequest.log.error).not.toBeCalled();
        });
    })

    describe("Parsing a request with a multiple string values {id: '100', name: 'bob', food: 'cake'}", () => {
        let params: Record<string, string>;
        let exampleRequest: FastifyRequest;

        beforeEach(() => {
            params = {
                id: "100",
                name: "bob",
                food: "cake"
            }
            exampleRequest = generateExampleRequest(params);
        });

        test("parseParams(request, z.object())", () => {
            const schema = z.object()
            expect(() => parseParams(exampleRequest, schema)).not.toThrow();
            expect(parseParams(exampleRequest, schema)).toStrictEqual({});
            expect(exampleRequest.log.error).not.toBeCalled();
        });

        test("parseParams(request, z.strictObject({}))", () => {
            const schema = z.strictObject({})
            expect(() => parseParams(exampleRequest, schema)).toThrow(HttpError);
            expect(exampleRequest.log.error)
                .toBeCalledWith(schema.safeParse(params).error);
        })

        test("parseParams(request, z.object({ id: z.int() }))", () => {
            const schema = z.object({ id: z.int() })
            expect(() => parseParams(exampleRequest, schema)).toThrow(HttpError);
            expect(exampleRequest.log.error).toBeCalledWith(schema.safeParse(params).error);
        });

        test("parseParams(request, z.object({ id: stringToSerial }))", () => {
            const schema = z.object({ id: stringToSerial })
            expect(() => parseParams(exampleRequest, schema)).not.toThrow();
            expect(parseParams(exampleRequest, schema)).toStrictEqual({
                id: 100
            })
            expect(exampleRequest.log.error).not.toBeCalled();
        });

        test("parseParams(request, z.strictObject({ id: stringToSerial }))", () => {
            const schema = z.strictObject({ id: stringToSerial });
            expect(() => parseParams(exampleRequest, schema )).toThrow();
            expect(exampleRequest.log.error).toBeCalledWith(schema.safeParse(params).error);
        });


        test("parseParams(request, z.object({ name: z.string().max(10) }))", () => {
            const schema = z.object({ name: z.string().max(10) });
            expect(() => parseParams(exampleRequest, schema)).not.toThrow();
            expect(parseParams(exampleRequest, schema)).toStrictEqual({
                name: "bob"
            })
            expect(exampleRequest.log.error).not.toBeCalled();
        });

        test(`parseParams(request, z.strictObject({
                id: stringToSerial,
                name: z.string().max(10),
                food: z.string().max(32)
            }))`, () => {
            const schema = z.strictObject({
                id: stringToSerial,
                name: z.string().max(10),
                food: z.string().max(32)
            });
            expect(() => parseParams(exampleRequest, schema)).not.toThrow();
            expect(parseParams(exampleRequest, schema)).toStrictEqual({
                id: 100,
                name: "bob",
                food: "cake"
            })
            expect(exampleRequest.log.error).not.toBeCalled();
        });

    })
});

describe(parseSchema, () => {
    const generateMockServer = () => ({
        log: { error: vi.fn() }
    } as unknown as FastifyInstance)
    let MockServer: ReturnType<typeof generateMockServer>
    beforeEach(() => {
        MockServer = generateMockServer()
    })

    const errorContexts = {
        "ParseContext.Request": {
            idx: ParseContext.Request,
            err: new HttpError(HttpClientError.BadRequest, "Invalid request data")
        },
        "ParseContext.Database": {
            idx: ParseContext.Database,
            err: new HttpError(HttpServerError.InternalServerError, "Internal server error")
        }
    }
    let schema: z.ZodObject  = z.object();
    const expectedParseErrors = (value: Object) => schema.safeParse(value).error;

    for (const [ctx, {idx, err}] of Object.entries(errorContexts)) {
        describe(`Parsing in a ${ctx} context`, () => {
            describe("Parsing an empty schema: z.object({})", () => {
                beforeEach(() => {
                    schema = z.object({});
                })

                test(`parseSchema(server, schema, {}, ${ctx})`, () => {
                    expect(parseSchema(MockServer, schema, {}, idx)).toStrictEqual({});
                    expect(MockServer.log.error).not.toBeCalled();
                });

                test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
                    expect(parseSchema(MockServer, schema, {id: 100}, idx)).toStrictEqual({});
                    expect(MockServer.log.error).not.toBeCalled();
                });

                test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
                    expect(parseSchema(MockServer, schema, {name: "blah"}, idx)).toStrictEqual({});
                    expect(MockServer.log.error).not.toBeCalled();
                });
            });


            describe("Parsing a strict empty schema: z.strictObject({})", () => {
                beforeEach(() => {
                    schema = z.strictObject({});
                })

                test(`parseSchema(server, schema, {}, ${ctx})`, () => {
                    expect(parseSchema(MockServer, schema, {}, idx)).toStrictEqual({});
                    expect(MockServer.log.error).not.toBeCalled();
                });

                test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {id: 100}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({id: 100}));
                });

                test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {name: "blah"}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({name: "blah"}));;
                });
            });

            describe("Parsing a schema with an integer id field: z.strictObject({id: z.int()})", () => {
                beforeEach(() => {
                    schema = z.strictObject({id: z.int()});
                })

                test(`parseSchema(server, schema, {}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({}));
                });

                test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
                    expect(parseSchema(MockServer, schema, { id: 100 }, idx)).toStrictEqual({
                        id: 100
                    });
                    expect(MockServer.log.error).not.toBeCalled()
                });

                test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {name: "blah"}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({name: "blah"}));;
                });
            });

            describe(`Parsing a schema with multiple fields: z.object({
                        id: serial(),
                        name: z.string().max(32),
                        friends: z.array(z.int())
                })`,() => {
                beforeEach(() => {
                    schema = z.object({
                        id: serial(),
                        name: z.string().max(32),
                        friends: z.array(z.int())
                    });
                })

                test(`parseSchema(server, schema, {}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({}));
                });

                test(`parseSchema(server, schema, {id: 100}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, { id: 100 }, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({ id: 100 }));
                });

                test(`parseSchema(server, schema, {name: 'blah'}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {name: "blah"}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({name: "blah"}));
                });

                test(`parseSchema(server, schema, {name: 'blah', id: 100}, ${ctx})`, () => {
                    expect(() => parseSchema(MockServer, schema, {name: "blah", id: 100}, idx)).toThrow(err);
                    expect(MockServer.log.error).toBeCalledWith(expectedParseErrors({name: "blah", id: 100}));
                });

                test(`parseSchema(server, schema, {name: 'blah', id: 100, friends: []}, ${ctx})`, () => {
                    expect(parseSchema(MockServer, schema, { name: "blah", id: 100, friends: [] }, idx))
                        .toStrictEqual({ name: "blah", id: 100, friends: [] });
                    expect(MockServer.log.error).not.toBeCalled();
                });
            });
        });
    }
})