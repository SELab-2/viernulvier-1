import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, HttpError, HttpServerError } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import { ProductionBodySchema } from "./body-schema.js";
import { getFieldValue } from "./field-utils.js";
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
 * Unlike `editProduction`, all fields are required and will be overwritten.
 * Also updates the production_tag relations based on the provided tags array.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is persisted.
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
  const tags = body.tags;

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Update production within transaction
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const column of ReplaceColumns) {
      fields.push(`${column} = $${i++}`);
      values.push(getFieldValue(body, column));
    }

    fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
    values.push(admin, current_time, id);

    await client.query(
      `UPDATE production SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id`,
      values,
    );

    // Delete existing tag relations
    await client.query(
      `DELETE FROM production_tag WHERE production = $1`,
      [id],
    );

    // Insert new tag relations
    for (const tag of tags) {
      await client.query(
        `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $4)
         ON CONFLICT DO NOTHING`,
        [id, tag, admin, current_time],
      );
    }

    await client.query("COMMIT");
    return await getProductionById(server, id);
  } catch (err) {
    await client.query("ROLLBACK");
    server.log.error(err);
    throw new HttpError(HttpServerError.InternalServerError, "Internal server error");
  } finally {
    client.release();
  }
}

