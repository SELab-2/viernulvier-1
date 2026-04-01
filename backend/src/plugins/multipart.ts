import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";

/**
 * Registers the `@fastify/multipart` plugin with sensible defaults for
 * image uploads.
 *
 * @param server - The Fastify instance to register the plugin on.
 */
export default fp(async function multipartPlugin(server: FastifyInstance) {
  server.log.info("Registering multipart plugin...");

  await server.register(multipart, {
    limits: {
      fileSize: 250 * 1024 * 1024, // 250 MB per file
      files: 20, // max files per request
      fields: 10, // max non-file fields per request
    },
  });

  server.log.info("Multipart plugin registered");
});