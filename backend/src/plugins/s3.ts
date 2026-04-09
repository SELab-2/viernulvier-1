import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { S3Client } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function readEnvFile(filePath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(filePath)) return vars;
  try {
    const raw = readFileSync(filePath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.replace(/\r$/, "").trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      vars[key] = value;
    }
  } catch {
    // silently ignore
  }
  return vars;
}

const CREDENTIAL_PATHS = [
  "/garage-credentials/credentials.env",
  resolve(import.meta.dirname ?? process.cwd(), "../../garage-credentials/credentials.env"),
];

function resolveCredentials(): { accessKeyId: string; secretAccessKey: string } | null {
  let accessKeyId = process.env["GARAGE_ACCESS_KEY_ID"];
  let secretAccessKey = process.env["GARAGE_SECRET_ACCESS_KEY"];

  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }

  for (const credPath of CREDENTIAL_PATHS) {
    const vars = readEnvFile(credPath);
    if (vars["GARAGE_ACCESS_KEY_ID"] && vars["GARAGE_SECRET_ACCESS_KEY"]) {
      return {
        accessKeyId: vars["GARAGE_ACCESS_KEY_ID"],
        secretAccessKey: vars["GARAGE_SECRET_ACCESS_KEY"],
      };
    }
  }

  return null;
}

/**
 * Mutable container for the S3 client. The `client` property can be
 * swapped out in tests without fighting Fastify's non-configurable
 * decorator properties.
 */
export interface S3Container {
  client: S3Client;
}

/**
 * Decorates the Fastify instance with `server.s3` — a container whose
 * `.client` property lazily creates the real S3Client on first access.
 *
 * In tests, replace `server.s3.client` with a mock at any time.
 */
export default fp(async function s3Plugin(server: FastifyInstance) {
  let realClient: S3Client | undefined;

  const container: S3Container = {
    get client(): S3Client {
      if (realClient) return realClient;

      const creds = resolveCredentials();
      if (!creds) {
        throw new Error(
          "Garage S3 credentials are not available. " +
            "Set GARAGE_ACCESS_KEY_ID / GARAGE_SECRET_ACCESS_KEY env vars " +
            "or place garage-credentials/credentials.env in the repo root.",
        );
      }

      const endpoint =
        process.env["GARAGE_S3_ENDPOINT"] ?? "http://viernulvier-garage:3900";

      realClient = new S3Client({
        region: "garage",
        endpoint,
        forcePathStyle: true,
        credentials: creds,
      });

      server.log.info("S3 (Garage) client initialised (lazy)");
      return realClient;
    },
    set client(mock: S3Client) {
      realClient = mock;
    },
  };

  server.decorate("s3", container);

  server.addHook("onClose", () => {
    if (realClient) {
      realClient.destroy();
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Container;
  }
}