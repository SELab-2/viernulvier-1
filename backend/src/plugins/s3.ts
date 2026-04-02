import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { S3Client } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Attempts to parse KEY=VALUE pairs from a file path.
 * Returns an object with any found keys, or an empty object on failure.
 */
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

/** Paths to try when env vars are missing: Docker mount, then local dev. */
const CREDENTIAL_PATHS = [
  "/garage-credentials/credentials.env",
  resolve(import.meta.dirname ?? process.cwd(), "../../garage-credentials/credentials.env"),
];

function resolveCredentials(): { accessKeyId: string; secretAccessKey: string } | null {
  const accessKeyId = process.env["GARAGE_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["GARAGE_SECRET_ACCESS_KEY"];

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
 * Decorates the Fastify instance with a lazy `server.s3` getter.
 *
 * The S3Client is **not** created at boot time — it is only instantiated
 * on first access. This means credentials are only required when a route
 * actually uses S3 (media upload / delete). Tests and CI environments that
 * don't touch media routes will never trigger the getter and therefore
 * don't need Garage credentials at all.
 *
 * @param server - The Fastify instance to register the plugin on.
 */
export default fp(async function s3Plugin(server: FastifyInstance) {
  let client: S3Client | undefined;

  server.decorate("s3", {
    getter() {
      if (client) return client;

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

      client = new S3Client({
        region: "garage",
        endpoint,
        forcePathStyle: true,
        credentials: creds,
      });

      server.log.info("S3 (Garage) client initialised (lazy)");
      return client;
    },
  });

  server.addHook("onClose", () => {
    if (client) {
      client.destroy();
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client;
  }
}