// mock for the authorize that makes it always pass

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export default fp((server: FastifyInstance) => {
  server.decorate("authorize", () => async () => {});
});