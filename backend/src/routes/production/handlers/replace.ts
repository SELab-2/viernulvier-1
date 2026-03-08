import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { ProductionSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parse } from "@/routes/helpers.js";
import z from "zod";
import { getProductionById } from "./fetch.js";

const ProductionShape = ProductionSchema.shape;

const ReplaceProductionBodySchema = z.object({
  vendor_id: ProductionShape["vendor_id"]!,
  box_office_id: ProductionShape["box_office_id"]!,
  supertitle: ProductionShape["supertitle"]!,
  title: ProductionShape["title"]!,
  artist: ProductionShape["artist"]!,
  tagline: ProductionShape["tagline"]!,
  teaser: ProductionShape["teaser"]!,
  description: ProductionShape["description"]!,
  description_extra: ProductionShape["description_extra"]!,
  description_2: ProductionShape["description_2"]!,
  video_1: ProductionShape["video_1"]!,
  video_2: ProductionShape["video_2"]!,
  quote: ProductionShape["quote"]!,
  quote_source: ProductionShape["quote_source"]!,
  programme: ProductionShape["programme"]!,
  info: ProductionShape["info"]!,
});

const ReplaceColumns = [
  "vendor_id",
  "box_office_id",
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
export async function replaceProduction(server: FastifyInstance, request: FastifyRequest): Promise<Production | null> {
  const id = getParam(request, "id");
  const body = parse(server, ReplaceProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata();

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const column of ReplaceColumns) {
    fields.push(`${column} = $${i++}`);
    values.push(body[column]);
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

