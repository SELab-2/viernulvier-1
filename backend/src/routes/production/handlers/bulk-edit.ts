import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { ProductionSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parse } from "@/routes/helpers.js";
import z from "zod";
import { getProductionById } from "./fetch.js";

const ProductionShape = ProductionSchema.shape;

const EditProductionBodySchema = z
  .object({
    vendor_id: ProductionShape["vendor_id"]!,
    box_office_id: ProductionShape["box_office_id"]!,
    supertitle: ProductionShape["supertitle"]!.optional(),
    title: ProductionShape["title"]!,
    artist: ProductionShape["artist"]!,
    tagline: ProductionShape["tagline"]!,
    teaser: ProductionShape["teaser"]!,
    description: ProductionShape["description"]!.optional(),
    description_extra: ProductionShape["description_extra"]!.optional(),
    description_2: ProductionShape["description_2"]!.optional(),
    video_1: ProductionShape["video_1"]!.optional(),
    video_2: ProductionShape["video_2"]!.optional(),
    quote: ProductionShape["quote"]!.optional(),
    quote_source: ProductionShape["quote_source"]!.optional(),
    programme: ProductionShape["programme"]!.optional(),
    info: ProductionShape["info"]!.optional(),
  }).partial();

const BulkEditProductionsBodySchema = z.object({
  ids: z.array(ProductionShape["id"]!).min(1),
  data: EditProductionBodySchema,
});

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

  addField("vendor_id", data.vendor_id);
  addField("box_office_id", data.box_office_id);
  if (Object.prototype.hasOwnProperty.call(data, "supertitle")) {
    addField("supertitle", data.supertitle ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "title")) {
    addField("title", data.title);
  }
  if (Object.prototype.hasOwnProperty.call(data, "artist")) {
    addField("artist", data.artist);
  }
  if (Object.prototype.hasOwnProperty.call(data, "tagline")) {
    addField("tagline", data.tagline);
  }
  if (Object.prototype.hasOwnProperty.call(data, "teaser")) {
    addField("teaser", data.teaser);
  }
  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    addField("description", data.description ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "description_extra")) {
    addField("description_extra", data.description_extra ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "description_2")) {
    addField("description_2", data.description_2 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "video_1")) {
    addField("video_1", data.video_1 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "video_2")) {
    addField("video_2", data.video_2 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "quote")) {
    addField("quote", data.quote ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "quote_source")) {
    addField("quote_source", data.quote_source ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "programme")) {
    addField("programme", data.programme ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(data, "info")) {
    addField("info", data.info ?? null);
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
