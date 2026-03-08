import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parse } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import { PartialProductionBodySchema } from "./body-schema.js";

const DirectEditColumns = [
  "vendor_id",
  "box_office_id",
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
export async function editProduction(server: FastifyInstance, request: FastifyRequest): Promise<Production | null> {
  const id = getParam(request, "id");
  const body = parse(server, PartialProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata();

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  const bodyRecord = body as Record<string, unknown>;

  for (const column of DirectEditColumns) {
    if (Object.prototype.hasOwnProperty.call(bodyRecord, column)) {
      addField(column, bodyRecord[column]);
    }
  }
  for (const column of NullableEditColumns) {
    if (Object.prototype.hasOwnProperty.call(bodyRecord, column)) {
      addField(column, bodyRecord[column] ?? null);
    }
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
