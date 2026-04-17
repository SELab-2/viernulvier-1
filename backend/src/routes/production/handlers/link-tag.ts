import type { FastifyInstance, FastifyRequest } from "fastify";
import { stringToInt } from "@viernulvier/shared/types/helpers.js";
import { getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import z from "zod";

const LinkProductionTagBodySchema = z.object({
  tag: z.int(),
});

/**
 * Idempotent link: inserts into `production_tag` when missing.
 *
 * @returns `{ linked: true }` when a new row was inserted, `{ linked: false }` when it already existed.
 */
export async function linkTagToProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<{ linked: boolean } | null> {
  const { id: productionId } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, LinkProductionTagBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const res = await server.pg.query<{ production: number; tag: number }>(
    `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $3, $4, $4)
     ON CONFLICT DO NOTHING
     RETURNING production, tag`,
    [productionId, body.tag, admin, current_time],
  );

  return { linked: (res.rowCount ?? 0) > 0 };
}
