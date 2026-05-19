import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { serial } from "@viernulvier/shared/index.js";
import { HttpClientError, HttpError, HttpServerError, getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import { PartialProductionBodySchema } from "./body-schema.js";
import { getFieldValue, getNullableFieldValue, hasOwn } from "./field-utils.js";
import z from "zod";

const DirectEditColumns = [
  "title",
  "artist",
  "tagline",
  "teaser",
] as const;

const NullableEditColumns = [
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
 * Partially updates an existing production and returns the updated record.
 * If tags array is provided, updates the production_tag relations.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is persisted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial production body.
 * @returns The updated production, or `null` if the update failed or parsing failed.
 */
export async function editProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const body = parseSchema(server, PartialProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);
  const tags = body.tags;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };
  console.log(body);
  for (const column of DirectEditColumns) {
    if (hasOwn(body, column)) {
      addField(column, getFieldValue(body, column));
    }
  }
  for (const column of NullableEditColumns) {
    if (hasOwn(body, column)) {
      addField(column, getNullableFieldValue(body, column));
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
      fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
      values.push(admin, current_time, id);

      await client.query(
        `UPDATE production SET ${fields.join(", ")} WHERE id = $${i}
         RETURNING id`,
        values,
      );
    }

    // Update production_tag relations if tags array is provided
    if (tags !== undefined) {
      // Delete existing relations
      await client.query(
        `DELETE FROM production_tag WHERE production = $1`,
        [id],
      );

      // Insert new relations
      for (const tag of tags) {
        await client.query(
          `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3, $3, $4, $4)
           ON CONFLICT DO NOTHING`,
          [id, tag, admin, current_time],
        );
      }
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
