import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, HttpError, HttpServerError } from "@/routes/helpers.js";
import { CreateProductionBodySchema } from "./body-schema.js";
import { getFieldValue, getNullableFieldValue } from "./field-utils.js";
import { getProductionById } from "./fetch.js";

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

type CreateProductionDbClient = {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
};

function buildCreateProductionInsertData(
  body: Record<string, unknown>,
  admin: number,
  currentTime: Date,
): { fields: string[]; placeholders: string[]; values: unknown[] } {
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

  fields.push("created_by", "updated_by", "created_at", "updated_at");
  placeholders.push(`$${i++}`, `$${i++}`, `$${i++}`, `$${i++}`);
  values.push(admin, admin, currentTime, currentTime);

  return { fields, placeholders, values };
}

async function insertCreatedProduction(
  client: CreateProductionDbClient,
  body: Record<string, unknown>,
  admin: number,
  currentTime: Date,
): Promise<{ id: number } | null> {
  const { fields, placeholders, values } = buildCreateProductionInsertData(body, admin, currentTime);

  const insertResult = await client.query<{ id: number }>(
    `INSERT INTO production (${fields.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING id`,
    values,
  );

  return insertResult.rows[0] ?? null;
}
/**
 * Creates a new production and returns the created record.
 * Also creates production_tag relations for each tag ID in the input.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is inserted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a production body with optional tags array.
 * @returns The created production, or `null` if the insert failed or parsing failed.
 */
export async function createProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs | null> {
  const body = parseSchema(server, CreateProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);
  const tagIds = [...new Set(body.tags ?? [])];
  const useTransaction = tagIds.length > 0;

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    const row = await insertCreatedProduction(client, body, admin, current_time);
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }

    if (useTransaction) {
      await client.query(
        `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
         SELECT $1, t, $2, $2, $3, $3
         FROM UNNEST($4::int[]) AS t
         ON CONFLICT DO NOTHING`,
        [row.id, admin, current_time, tagIds],
      );
    }

    await client.query("COMMIT");
    return await getProductionById(server, row.id);
  } catch (err) {
    await client.query("ROLLBACK");
    server.log.error(err);
    if (useTransaction) {
      throw err;
    }
    throw new HttpError(HttpServerError.InternalServerError, "Internal server error");
  } finally {
    client.release();
  }
}

