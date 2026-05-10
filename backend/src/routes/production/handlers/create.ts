import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema } from "@/routes/helpers.js";
import { CreateProductionBodySchema } from "./body-schema.js";
import { getProductionById } from "./fetch.js";
import { getFieldValue, getNullableFieldValue } from "./field-utils.js";

const RequiredCreateColumns = [
  "title",
  "artist",
  "tagline",
  "teaser",
  "finalized",
] as const;

const NullableCreateColumns = [
  "old_id",
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
 * Creates a new production and returns the created record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a production body.
 * @returns The created production, or `null` if the insert failed or parsing failed.
 */
export async function createProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs | null> {
  const body = parseSchema(server, CreateProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const tagIds = [...new Set((body.tags ?? []).filter((tagId) => Number.isInteger(tagId) && tagId > 0))];
  const useTransaction = tagIds.length > 0;

  if (useTransaction) {
    const client = await server.pg.connect();
    try {
      await client.query("BEGIN");

      const fields: string[] = [];
      const placeholders: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      const addField = (column: string, value: unknown) => {
        fields.push(column);
        placeholders.push(`$${i++}`);
        values.push(value);
      };

      for (const column of RequiredCreateColumns) {
        addField(column, getFieldValue(body, column));
      }
      for (const column of NullableCreateColumns) {
        addField(column, getNullableFieldValue(body, column));
      }

      // Metadata
      fields.push("created_by", "updated_by", "created_at", "updated_at");
      placeholders.push(`$${i++}`, `$${i++}`, `$${i++}`, `$${i++}`);
      values.push(admin, admin, current_time, current_time);

      const insertResult = await client.query<{ id: number }>(
        `INSERT INTO production (${fields.join(", ")})
         VALUES (${placeholders.join(", ")})
         RETURNING id`,
        values,
      );

      const row = insertResult.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
         SELECT $1, t, $2, $2, $3, $3
         FROM UNNEST($4::int[]) AS t
         ON CONFLICT DO NOTHING`,
        [row.id, admin, current_time, tagIds],
      );

      await client.query("COMMIT");
      return await getProductionById(server, row.id);
    } catch (err) {
      await client.query("ROLLBACK");
      server.log.error(err);
      throw err;
    } finally {
      client.release();
    }
  }

  const fields: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    fields.push(column);
    placeholders.push(`$${i++}`);
    values.push(value);
  };

  for (const column of RequiredCreateColumns) {
    addField(column, getFieldValue(body, column));
  }
  for (const column of NullableCreateColumns) {
    addField(column, getNullableFieldValue(body, column));
  }

  // Metadata
  fields.push("created_by", "updated_by", "created_at", "updated_at");
  placeholders.push(`$${i++}`, `$${i++}`, `$${i++}`, `$${i++}`);
  values.push(admin, admin, current_time, current_time);

  const insertResult = await server.pg.query<Omit<ProductionWithBackwardsRefs, "events" | "tags" | "blogposts">>(
    `INSERT INTO production (${fields.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING 
       id,
       old_id,
       finalized,
       supertitle,
       title,
       artist,
       tagline,
       teaser,
       description,
       description_extra,
       description_2,
       video_1,
       video_2,
       quote,
       quote_source,
       programme,
       info`,
    values,
  );

  const row = insertResult.rows[0];
  if (!row) return null;

  // Newly created productions have no events, tags, or blogposts
  return {
    ...row,
    events: [],
    tags: [],
    blogposts: [],
  } as ProductionWithBackwardsRefs;
}

