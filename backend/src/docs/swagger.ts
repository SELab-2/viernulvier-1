import { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

export default fp(async (server: FastifyInstance) => {
  server.register(swagger);

  server.register(swaggerUI, { routePrefix: "/api" });
});
