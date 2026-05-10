import { CombinedRequestSchema, RequestBody, RequestDescription, RequestError, RequestParams, RequestResponse, requestSchema, RequestTag } from "@/docs/helpers.js";
import { describe, expect, expectTypeOf, test } from "vitest";
import z from "zod";

describe(RequestDescription, () => {
  describe("Creating a basic RequestDescription", () => {
    test("new RequestDescription('I am a description')", () => {
      const description = new RequestDescription("I am a description");
      expect(description.schema.description, "should contain the correct description.").toBe("I am a description");
      expect(description.schema, "should not contain any other properties.").toEqual({ description: "I am a description" });
    });
  });
  describe("Combining two RequestDescriptions", () => {
    test("new CombinedRequestSchema(new RequestDescription('I am a description'), new RequestDescription('I am another description'))", () => {
      const description1 = new RequestDescription("I am a description");
      const description2 = new RequestDescription("I am another description");
      expect(description1.schema.description, "description 1 should contain the correct description.").toBe("I am a description");
      expect(description2.schema.description, "description 2 should contain the correct description.").toBe("I am another description");

      const combined = new CombinedRequestSchema(description1, description2);
      expect(combined.schema.description, "combined description should be the one from the last schema.").toBe("I am another description");
      expect(combined.schema, "should not contain any other properties.").toEqual({ description: "I am another description" });
    });
  });
});

describe(RequestBody, () => {
  describe("Creating a basic RequestBody", () => {
    test("new RequestBody(z.object({name: z.string()}))", () => {
      const testSchema = z.object({ name: z.string() });
      const body = new RequestBody(testSchema);
      expect(body.schema.body, "should contain the correct body schema.").toStrictEqual(testSchema);
      expect(Object.keys(body.schema), "should only contain the 'body' property.").toStrictEqual(["body"]);
    });
  });

  describe("Combining two RequestBodies", () => {
    test("new CombinedRequestSchema(new RequestBody(z.object({name: z.string()})), new RequestBody(z.object({age: z.number()})))", () => {
      const bodySchema1 = z.object({ name: z.string() });
      const bodySchema2 = z.object({ age: z.number() });
      const body1 = new RequestBody(bodySchema1);
      const body2 = new RequestBody(bodySchema2);
      expect(body1.schema.body, "body 1 should contain the correct body schema.").toStrictEqual(bodySchema1);
      expect(body2.schema.body, "body 2 should contain the correct body schema.").toStrictEqual(bodySchema2);
      const combined = new CombinedRequestSchema(body1, body2);
      expect(combined.schema.body, "combined body should contain the correct body schema.").toStrictEqual(bodySchema2);
      expect(Object.keys(combined.schema), "should only contain the 'body' property.").toStrictEqual(["body"]);
    });
  });
});

describe(RequestError, () => {
  describe("Creating a basic RequestErrorMessage", () => {
    test("new RequestErrorMessage(404, 'Not Found')", () => {
      const errorMessage = new RequestError(404, "Not Found");
      expect(errorMessage.schema.response, "should contain the correct error message schema.").toHaveProperty("404");
      expect(Object.keys(errorMessage.schema), "should not contain any other properties.").toEqual(["response"]);
    });
  });

  describe("Combining two RequestErrorMessages", () => {
    test("new CombinedRequestSchema(new RequestErrorMessage(404, 'Not Found'), new RequestErrorMessage(500, 'Internal Server Error')))", () => {
      const errorMessage1 = new RequestError(404, "Not Found");
      const errorMessage2 = new RequestError(500, "Internal Server Error");
      expect(errorMessage1.schema.response, "error message 1 should contain the correct error message schema.").toHaveProperty("404");
      expect(errorMessage2.schema.response, "error message 2 should contain the correct error message schema.").toHaveProperty("500");

      const combined = new CombinedRequestSchema(errorMessage1, errorMessage2);
      expect(combined.schema.response, "combined error message should contain both error messages.").toHaveProperty("404");
      expect(combined.schema.response, "combined error message should contain both error messages.").toHaveProperty("500");
      expect(Object.keys(combined.schema), "should not contain any other properties.").toEqual(["response"]);
    });
  });
});

describe(RequestTag, () => {
  describe("Creating a basic RequestTag", () => {
    test("new RequestTag('user')", () => {
      const tag = new RequestTag("user");
      expect(tag.schema.tags, "should contain the correct tag.").toEqual(["user"]);
      expect(tag.schema, "should not contain any other properties.").toEqual({ tags: ["user"] });
    });
  });

  describe("Combining two RequestTags", () => {
    test("new CombinedRequestSchema(new RequestTag('user'), new RequestTag('admin'))", () => {
      const tag1 = new RequestTag("user");
      const tag2 = new RequestTag("admin");
      expect(tag1.schema.tags, "tag 1 should contain the correct tag.").toEqual(["user"]);
      expect(tag2.schema.tags, "tag 2 should contain the correct tag.").toEqual(["admin"]);

      const combined = new CombinedRequestSchema(tag1, tag2);
      expect(combined.schema.tags, "combined tags should contain both tags.").toEqual(["user", "admin"]);
      expect(combined.schema, "should not contain any other properties.").toEqual({ tags: ["user", "admin"] });
    });
  });
});

describe(RequestParams, () => {
  describe("Creating a basic RequestParams", () => {
    test("new RequestParams(z.object({id: z.string()}))", () => {
      const testSchema = z.object({ id: z.string() });
      const params = new RequestParams(testSchema);
      expect(params.schema.params, "should contain the correct params schema.").toEqual(testSchema);
      expect(params.schema, "should not contain any other properties.").toEqual({ params: testSchema });
    });
  });

  describe("Combining two RequestParams", () => {
    test("new CombinedRequestSchema(new RequestParams(z.object({id: z.string()})), new RequestParams(z.object({age: z.number()})))", () => {
      const testSchema1 = z.object({ id: z.string() });
      const testSchema2 = z.object({ age: z.number() });
      const params1 = new RequestParams(testSchema1);
      const params2 = new RequestParams(testSchema2);
      expect(params1.schema.params, "params 1 should contain the correct params schema.").toEqual(testSchema1);
      expect(params2.schema.params, "params 2 should contain the correct params schema.").toEqual(testSchema2);

      const combined = new CombinedRequestSchema(params1, params2);
      expect(combined.schema.params, "combined params should be the one from the last schema.").toEqual(testSchema2);
      expect(combined.schema, "should not contain any other properties.").toEqual({ params: testSchema2 });
    });
  });
});

describe(RequestResponse, () => {
  describe("Creating a basic RequestResponse", () => {
    test("new RequestResponse(200, z.object({id: z.number()}))", () => {
      const testSchema = z.object({ id: z.number() });
      const response = new RequestResponse(200, testSchema);
      expect(response.schema.response, "should contain the correct response schema.").toEqual({ 200: testSchema });
      expect(response.schema, "should not contain any other properties.").toEqual({ response: { 200: testSchema } });
    });
  });

  describe("Combining two RequestResponses", () => {
    test("new CombinedRequestSchema(new RequestResponse(200, z.object({id: z.number()})), new RequestResponse(201, z.object({error: z.string()})))", () => {
      const testSchema1 = z.object({ id: z.number() });
      const testSchema2 = z.object({ error: z.string() });
      const response1 = new RequestResponse(200, testSchema1);
      const response2 = new RequestResponse(201, testSchema2);
      expect(response1.schema.response, "response 1 should contain the correct response schema.").toEqual({ 200: testSchema1 });
      expect(response2.schema.response, "response 2 should contain the correct response schema.").toEqual({ 201: testSchema2 });

      const combined = new CombinedRequestSchema(response1, response2);
      expect(combined.schema.response, "combined response should contain both responses.").toEqual({ 200: testSchema1, 201: testSchema2 });
      expect(combined.schema, "should not contain any other properties.").toEqual({ response: { 200: testSchema1, 201: testSchema2 } });
    });
    test("Combining two RequestResponses with the same status code should keep the one from the last schema", () => {
      const testSchema1 = z.object({ id: z.number() });
      const testSchema2 = z.object({ name: z.string() });
      const response1 = new RequestResponse(200, testSchema1);
      const response2 = new RequestResponse(200, testSchema2);
      expect(response1.schema.response, "response 1 should contain the correct response schema.").toEqual({ 200: testSchema1 });
      expect(response2.schema.response, "response 2 should contain the correct response schema.").toEqual({ 200: testSchema2 });

      const combined = new CombinedRequestSchema(response1, response2);
      expect(combined.schema.response, "combined response should be the one from the last schema.").toEqual({ 200: testSchema2 });
      expect(combined.schema, "should not contain any other properties.").toEqual({ response: { 200: testSchema2 } });
    });
  });
});

describe(CombinedRequestSchema, () => {
  describe("Combining multiple schemas together", () => {
    test("new CombinedRequestSchema(new RequestDescription('I am a description'), new RequestTag('user'), new RequestParams(z.object({id: z.string()})), new RequestResponse(200, z.object({name: z.string()})))", () => {
      const description = new RequestDescription("I am a description");
      const tag = new RequestTag("user");
      const params = new RequestParams(z.object({ id: z.string() }));
      const response = new RequestResponse(200, z.object({ name: z.string() }));

      const combined = new CombinedRequestSchema(description, tag, params, response);
      expect(combined.schema, "should contain all the properties from the combined schemas.").toStrictEqual({
        description: "I am a description",
        tags: ["user"],
        params: params.schema.params,
        response: response.schema.response,
      });
    });
  });
});

describe(requestSchema, () => {
  describe("Creating a request schema with multiple schemas", () => {
    test("requestSchema(new RequestDescription('I am a description'), new RequestTag('user'), new RequestParams(z.object({id: z.string()})), new RequestResponse(200, z.object({name: z.string()})))", () => {
      const description = new RequestDescription("I am a description");
      const tag = new RequestTag("user");
      const params = new RequestParams(z.object({ id: z.string() }));
      const response = new RequestResponse(200, z.object({ name: z.string() }));
      const schema = requestSchema(
        description,
        tag,
        params,
        response,
      );
      expect(schema, "should contain all the properties from the combined schemas.").toEqual({
        description: "I am a description",
        tags: ["user"],
        params: params.schema.params,
        response: response.schema.response,
      });
    });
  });
});