import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { ProductionSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parse } from "@/routes/helpers.js";
import z from "zod";
import { getProductionById } from "./fetch.js";

const ProductionShape = ProductionSchema.shape;

const EditProductionBodySchema = z
  .object({
    vendor_id: ProductionShape.vendor_id,
    box_office_id: ProductionShape.box_office_id,
    supertitle: ProductionShape.supertitle.optional(),
    title: ProductionShape.title,
    artist: ProductionShape.artist,
    tagline: ProductionShape.tagline,
    teaser: ProductionShape.teaser,
    description: ProductionShape.description.optional(),
    description_extra: ProductionShape.description_extra.optional(),
    description_2: ProductionShape.description_2.optional(),
    video_1: ProductionShape.video_1.optional(),
    video_2: ProductionShape.video_2.optional(),
    quote: ProductionShape.quote.optional(),
    quote_source: ProductionShape.quote_source.optional(),
    programme: ProductionShape.programme.optional(),
    info: ProductionShape.info.optional(),
  }).partial();

/**
 * Partially updates an existing production and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial production body.
 * @returns The updated production, or `null` if the update failed or parsing failed.
 */
export async function editProduction(server: FastifyInstance, request: FastifyRequest): Promise<Production | null> {
  const id = getParam(request, "id");
  const body = parse(server, EditProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata();

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  addField("vendor_id", body.vendor_id);
  addField("box_office_id", body.box_office_id);
  if (Object.prototype.hasOwnProperty.call(body, "supertitle")) {
    addField("supertitle", body.supertitle ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    addField("title", body.title);
  }
  if (Object.prototype.hasOwnProperty.call(body, "artist")) {
    addField("artist", body.artist);
  }
  if (Object.prototype.hasOwnProperty.call(body, "tagline")) {
    addField("tagline", body.tagline);
  }
  if (Object.prototype.hasOwnProperty.call(body, "teaser")) {
    addField("teaser", body.teaser);
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    addField("description", body.description ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "description_extra")) {
    addField("description_extra", body.description_extra ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "description_2")) {
    addField("description_2", body.description_2 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "video_1")) {
    addField("video_1", body.video_1 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "video_2")) {
    addField("video_2", body.video_2 ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "quote")) {
    addField("quote", body.quote ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "quote_source")) {
    addField("quote_source", body.quote_source ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "programme")) {
    addField("programme", body.programme ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(body, "info")) {
    addField("info", body.info ?? null);
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
