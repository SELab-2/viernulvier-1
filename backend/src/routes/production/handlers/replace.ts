import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import { ProductionBodySchema } from "./body-schema.js";
import { getFieldValue } from "./field-utils.js";
import z from "zod";

const ReplaceColumns = [
  "supertitle",
  "title",
  "artist",
  "tagline",
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
export async function replaceProduction(server: FastifyInstance, request: FastifyRequest): Promise<ProductionWithBackwardsRefs | null> {
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

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  await server.pg.query(
    `UPDATE production SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id`,
    values,
  );

  return await getProductionById(server, id);
}

