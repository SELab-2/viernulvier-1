import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import { ProductionBodySchema } from "./body-schema.js";
import { getFieldValue, hasOwn } from "./field-utils.js";
import z from "zod";

const ReplaceColumns = [
  "supertitle",
  "title",
  "artist",
  "tagline",
  "finalized",
  "old_id",
  "teaser",
  "description",
  "description_extra",
  "description_2",
  "video_1",
  "video_2",
  "quote",
  "quote_source",
  "programme",
  "info",
] as const;

/**
 * Replaces an existing production and returns the replaced record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a full production body.
 * @returns The replaced production, or `null` if not found.
 */
export async function replaceProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const column of ReplaceColumns) {
    fields.push(`${column} = $${i++}`);
    values.push(getFieldValue(body, column));
  }

  if (hasOwn(body, "tags")) {
    const nextTagIds = [...new Set((body.tags ?? []).filter((tagId) => Number.isInteger(tagId) && tagId > 0))];
    const client = await server.pg.connect();

    try {
      await client.query("BEGIN");

      fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
      values.push(admin, current_time, id);

      const updateRes = await client.query<{ id: number }>(
        `UPDATE production SET ${fields.join(", ")} WHERE id = $${i}
         RETURNING id`,
        values,
      );

      if (!updateRes.rows[0]?.id) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `DELETE FROM production_tag
         WHERE production = $1 AND NOT (tag = ANY($2::int[]))`,
        [id, nextTagIds],
      );

      await client.query(
        `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
         SELECT $1, t, $3, $3, $4, $4
         FROM UNNEST($2::int[]) AS t
         ON CONFLICT DO NOTHING`,
        [id, nextTagIds, admin, current_time],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      server.log.error(err);
      throw err;
    } finally {
      client.release();
    }

    return await getProductionById(server, id);
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  await server.pg.query(
    `UPDATE production SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id`,
    values,
  );

  return await getProductionById(server, id);
}

