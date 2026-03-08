import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { ProductionSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parse } from "@/routes/helpers.js";
import z from "zod";
import { getProductionById } from "./fetch.js";

const ProductionShape = ProductionSchema.shape;

const CreateProductionBodySchema = z.object({
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
});

const RequiredCreateColumns = [
  "vendor_id",
  "box_office_id",
  "title",
  "artist",
  "tagline",
  "teaser",
] as const;

const NullableCreateColumns = [
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
  const body = parse(server, CreateProductionBodySchema, request.body);

  const { admin, current_time } = getMetadata();

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
    addField(column, body[column]);
  }
  for (const column of NullableCreateColumns) {
    addField(column, body[column] ?? null);
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

