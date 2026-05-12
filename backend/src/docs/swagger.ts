import { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import path from "path";

export default fp(async (server: FastifyInstance) => {
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  server.setErrorHandler((err, req, reply) => {
    console.log(err);
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "Request doesn't match the schema",
        statusCode: 400,
        details: {
          issues: err.validation,
          method: req.method,
          url: req.url,
        },
      });
    }
    if (isResponseSerializationError(err)) {
      return reply.code(500).send({
        error: "Internal Server Error",
        message: "Response doesn't match the schema",
        statusCode: 500,
        details: {
          issues: err.cause.issues,
          method: err.method,
          url: err.url,
        },
      });
    }

    return reply;
  });

  server.register(swagger, {
    openapi: {
      info: {
        title: "Archief Viernulvier",
        description: "Een archief voor de viernulvier",
        version: "1.0.0",
      },
      servers: [],
      components: {
        securitySchemes: {
          "Login Session": {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  server.register(swaggerUI, {
    routePrefix: "/api/v1/docs",
    baseDir: path.resolve("static"),
  });

  server.get("/api", (_, reply) => reply.redirect("/api/v1/docs"));
});
