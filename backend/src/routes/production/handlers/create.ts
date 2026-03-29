import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import { CreateProductionBodySchema } from "./body-schema.js";
import { getFieldValue, getNullableFieldValue } from "./field-utils.js";

const RequiredCreateColumns = [
  "vendor_id",
  "box_office_id",
  "title",
  "artist",
  "tagline",
  "teaser",
] as const;

const NullableCreateColumns = [
  "old_id",
  "finalized",
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
export async function createProduction(server: FastifyInstance, request: FastifyRequest): Promise<Production | null> {
  const body = parseSchema(server, CreateProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

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

  const insertResult = await server.pg.query<{ id: number }>(
    `INSERT INTO production (${fields.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING id`,
    values,
  );

  const row = insertResult.rows[0];
  if (!row) return null;

  return await getProductionById(server, row.id);
}

