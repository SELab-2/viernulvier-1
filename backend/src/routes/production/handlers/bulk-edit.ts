import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { HttpClientError, HttpError, HttpServerError, getMetadata, parseSchema } from "@/routes/helpers.js";
import z from "zod";
import { getProductionsByIds } from "./fetch.js";
import { PartialProductionBodySchema, ProductionIdSchema } from "./body-schema.js";
import { getFieldValue, getNullableFieldValue, hasOwn } from "./field-utils.js";

export const BulkEditProductionsBodySchema = z.object({
  ids: z.array(ProductionIdSchema).min(1),
  data: PartialProductionBodySchema,
});

const DirectBulkEditColumns = [
  "title",
  "artist",
  "tagline",
  "teaser",
] as const;

const NullableBulkEditColumns = [
  "supertitle",
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
 * Bulk updates multiple productions and returns the updated records.
 * If tags array is provided, updates the production_tag relations for all productions.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is persisted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `ids` and `data` in its body.
 * @returns The updated productions array (can be empty), or `null` if parsing failed.
 */
export async function bulkEditProductions(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs[] | null> {
  const body = parseSchema(server, BulkEditProductionsBodySchema, request.body);
  const { ids, data } = body;

  const { admin, current_time } = getMetadata(request);
  const tags = data.tags;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;

    fields.push(
      `${column} = CASE WHEN $${i}::jsonb IS NULL THEN NULL ELSE COALESCE(${column}, '{}'::jsonb) || $${i}::jsonb END`,
    );
    i += 1;
    values.push(value);
  };

  for (const column of DirectBulkEditColumns) {
    if (hasOwn(data, column)) {
      addField(column, getFieldValue(data, column));
    }
  }
  for (const column of NullableBulkEditColumns) {
    if (hasOwn(data, column)) {
      addField(column, getNullableFieldValue(data, column));
    }
  }

  if (fields.length === 0 && tags === undefined) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Update production fields within transaction
    if (fields.length > 0) {
      // Always update metadata
      fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
      values.push(admin, current_time);
      values.push(ids);

      await client.query(
        `UPDATE production SET ${fields.join(", ")} WHERE id = ANY($${i})
        RETURNING id`,
        values,
      );
    }

    // Update production_tag relations if tags array is provided
    if (tags !== undefined) {
      // Delete existing relations for all productions
      await client.query(
        `DELETE FROM production_tag WHERE production = ANY($1::int[])`,
        [ids],
      );

      // Insert new relations for each production
      for (const productionId of ids) {
        for (const tag of tags) {
          await client.query(
            `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
             VALUES ($1, $2, $3, $3, $4, $4)
             ON CONFLICT DO NOTHING`,
            [productionId, tag, admin, current_time],
          );
        }
      }
    }

    await client.query("COMMIT");
    return await getProductionsByIds(server, ids as number[]);
  } catch (err) {
    await client.query("ROLLBACK");
    server.log.error(err);
    throw new HttpError(HttpServerError.InternalServerError, "Internal server error");
  } finally {
    client.release();
  }
}
