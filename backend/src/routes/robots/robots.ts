import type { FastifyInstance } from "fastify";

export default async function robotsRoutes(server: FastifyInstance) {
  server.get("/robots.txt", async (_, reply) => {
    const content = `User-agent: *
Disallow: /`;

    reply
      .header("Content-Type", "text/plain")
      .send(content);
  });
}