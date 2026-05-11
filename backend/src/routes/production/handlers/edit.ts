import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { HttpClientError, HttpError, getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import { stringToInt } from "@viernulvier/shared/index.js";
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
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial production body.
 * @returns The updated production, or `null` if the update failed or parsing failed.
 */
export async function editProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, PartialProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

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

  if (fields.length === 0 && !hasOwn(body, "tags")) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  if (hasOwn(body, "tags")) {
    const nextTagIds = [...new Set(body.tags ?? [])];
    const client = await server.pg.connect();

    try {
      await client.query("BEGIN");

      // Always update metadata
      const updateFields = [...fields, `updated_by = $${i++}`, `updated_at = $${i++}`];
      const updateValues = [...values, admin, current_time, id];

      const updateRes = await client.query<{ id: number }>(
        `UPDATE production SET ${updateFields.join(", ")} WHERE id = $${i}
         RETURNING id`,
        updateValues,
      );

      if (!updateRes.rows[0]?.id) {
        await client.query("ROLLBACK");
        return null;
      }

      // Replace semantics for tags: delete removed, insert missing.
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

  // Always update metadata
  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  await server.pg.query(
    `UPDATE production SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id`,
    values,
  );

  return await getProductionById(server, id);
}
