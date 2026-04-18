import { ProductionSchema } from "@viernulvier/shared/index.js";
import z from "zod";

const ProductionTagIdsSchema = z.array(z.int().positive()).optional();

export const ProductionBodySchema = ProductionSchema.pick({
  old_id: true,
  finalized: true,
  supertitle: true,
  title: true,
  artist: true,
  tagline: true,
  teaser: true,
  description: true,
  description_extra: true,
  description_2: true,
  video_1: true,
  video_2: true,
  quote: true,
  quote_source: true,
  programme: true,
  info: true,
}).extend({
  tags: ProductionTagIdsSchema,
});

export const CreateProductionBodySchema = ProductionSchema.pick({
  title: true,
}).extend(
  ProductionSchema.pick({
    artist: true,
    tagline: true,
    teaser: true,
    old_id: true,
    finalized: true,
    supertitle: true,
    description: true,
    description_extra: true,
    description_2: true,
    video_1: true,
    video_2: true,
    quote: true,
    quote_source: true,
    programme: true,
    info: true,
  }).partial().shape,
).extend({
  tags: ProductionTagIdsSchema,
});

export const PartialProductionBodySchema = ProductionBodySchema.partial();
const ProductionIdObjectSchema = ProductionSchema.pick({ id: true }) as z.ZodObject<{ id: z.ZodType }>;
export const ProductionIdSchema = ProductionIdObjectSchema.shape["id"];

