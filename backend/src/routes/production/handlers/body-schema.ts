import { ProductionSchema } from "@viernulvier/shared/index.js";
import z from "zod";

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
});

export const CreateProductionBodySchema = ProductionSchema.pick({
  title: true,
  artist: true,
  tagline: true,
  teaser: true,
}).extend(
  ProductionSchema.pick({
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
);

export const PartialProductionBodySchema = ProductionBodySchema.partial();
const ProductionIdObjectSchema = ProductionSchema.pick({ id: true }) as z.ZodObject<{ id: z.ZodType }>;
export const ProductionIdSchema = ProductionIdObjectSchema.shape["id"];

