import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { ProductionSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parse } from "@/routes/helpers.js";
import z from "zod";
import { getProductionById } from "./fetch.js";
import { EditProductionBodySchema } from "./edit.js";

const ProductionShape = ProductionSchema.shape;

const BulkEditProductionsBodySchema = z.object({
  ids: z.array(ProductionShape["id"]!).min(1),
  data: EditProductionBodySchema,
});

const DirectBulkEditColumns = [
  "vendor_id",
  "box_office_id",
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
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `ids` and `data` in its body.
 * @returns The updated productions array (can be empty), or `null` if parsing failed.
 */
export async function bulkEditProductions(server: FastifyInstance, request: FastifyRequest): Promise<Production[] | null> {
  const body = parse(server, BulkEditProductionsBodySchema, request.body);
  const { ids, data } = body;

  const { admin, current_time } = getMetadata();

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  const dataRecord = data as Record<string, unknown>;

  for (const column of DirectBulkEditColumns) {
    if (Object.prototype.hasOwnProperty.call(dataRecord, column)) {
      addField(column, dataRecord[column]);
    }
  }
  for (const column of NullableBulkEditColumns) {
    if (Object.prototype.hasOwnProperty.call(dataRecord, column)) {
      addField(column, dataRecord[column] ?? null);
    }
  }

  // Always update metadata
  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, ids);

  await server.pg.query(
    `UPDATE production SET ${fields.join(", ")} WHERE id = ANY($${i})
      RETURNING id`,
    values,
  );

  const updatedProductions = await Promise.all(ids.map((id) => getProductionById(server, id as string | number)));

  return updatedProductions.filter((p): p is Production => p !== null);
}
