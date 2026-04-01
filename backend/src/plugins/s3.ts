import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { S3Client } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

/**
 * Reads Garage S3 credentials from the mounted credentials file and
 * creates an S3Client pointed at the Garage container.
 *
 * Decorates the Fastify instance with `server.s3` for use in route handlers.
 *
 * @param server - The Fastify instance to register the plugin on.
 */
export default fp(async function s3Plugin(server: FastifyInstance) {
  server.log.info("Registering S3 (Garage) client...");

  const credentialsPath =
    process.env["GARAGE_CREDENTIALS_FILE"] ?? "/garage-credentials/credentials.env";

  let accessKeyId: string | undefined = process.env["GARAGE_ACCESS_KEY_ID"];
  let secretAccessKey: string | undefined = process.env["GARAGE_SECRET_ACCESS_KEY"];

  // If not supplied via env directly, read from the mounted credentials file.
  if (!accessKeyId || !secretAccessKey) {
    try {
      const raw = readFileSync(credentialsPath, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (key === "GARAGE_ACCESS_KEY_ID") accessKeyId = value;
        if (key === "GARAGE_SECRET_ACCESS_KEY") secretAccessKey = value;
      }
    } catch (err) {
      server.log.error(err, "Failed to read Garage credentials file");
      throw new Error(`Cannot read Garage credentials from ${credentialsPath}`);
    }
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Garage S3 credentials are not defined. " +
        "Set GARAGE_ACCESS_KEY_ID / GARAGE_SECRET_ACCESS_KEY env vars or mount the credentials file.",
    );
  }

  const endpoint =
    process.env["GARAGE_S3_ENDPOINT"] ?? "http://viernulvier-garage:3900";

  const client = new S3Client({
    region: "garage",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  server.decorate("s3", client);

  server.addHook("onClose", () => {
    client.destroy();
  });

  server.log.info("S3 (Garage) client registered");
});

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client;
  }
}