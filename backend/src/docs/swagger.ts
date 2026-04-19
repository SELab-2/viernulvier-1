import { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import path from 'path';

export default fp(async (server: FastifyInstance) => {
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  server.register(swagger, {
    openapi: {
      info: {
        title: "Archief Viernulvier",
        description: "Een archief voor de viernulvier",
        version: "1.0.0",
      },
      servers: [],
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
