import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

/**
 * Proxies GET /media/crops/* to the Garage S3 bucket.
 *
 * In production, nginx handles this directly. This route exists so that
 * local development (without nginx) can still serve crop images.
 *
 * @param server - The Fastify instance to register the proxy on.
 */
export default function cropProxyRoute(server: FastifyInstance) {
  server.get("/media/crops/*", async (request: FastifyRequest, reply: FastifyReply) => {
    const key = (request.params as { "*": string })["*"];

    if (!key) {
      return await reply.status(400).send({ error: "Missing crop key" });
    }

    try {
      const result = await server.s3.client.send(
        new GetObjectCommand({
          Bucket: "crops",
          Key: key,
        }),
      );

      if (result.ContentType) {
        void reply.header("Content-Type", result.ContentType);
      }
      if (result.ContentLength !== undefined) {
        void reply.header("Content-Length", result.ContentLength);
      }

      void reply.header("Cache-Control", "public, max-age=86400");

      return await reply.send(result.Body as Readable);
    } catch (err) {
      const error = err as { name?: string };
      if (error.name === "NoSuchKey") {
        return await reply.status(404).send({ error: "Crop not found" });
      }
      server.log.error(err);
      return await reply.status(502).send({ error: "Failed to fetch crop from storage" });
    }
  });
}