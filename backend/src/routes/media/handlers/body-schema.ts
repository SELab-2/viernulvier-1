import z from "zod";
import { ImageSchema, stringToInt } from "@viernulvier/shared/index.js";
import { CropSchema } from "@viernulvier/shared/index.js";

// ── Crop-file mapping (used inside multipart "data" JSON field) ──

export const CropMappingSchema = CropSchema.pick({ type: true }).extend({
  filename: z.string().min(1),
  oldId: z.number().int().nonnegative().optional(),
});

// ── Image body schemas ──

/** POST — create image, optionally with crops in one multipart request */
export const CreateImageBodySchema = ImageSchema.pick({
  res: true,
  old_id: true,
}).partial().extend({
  crops: z.array(CropMappingSchema).optional(),
});

/** PATCH — partially update image fields (res, old_id) */
export const PatchImageBodySchema = ImageSchema.pick({
  res: true,
  old_id: true,
}).partial();

/** PUT — fully replace image fields, optionally replace all crops */
export const ReplaceImageBodySchema = ImageSchema.pick({
  res: true,
  old_id: true,
}).extend({
  crops: z.array(CropMappingSchema).optional(),
});

/** FETCH - search query for images*/
export const ImageListQuerySchema = z.object({
  oldId: stringToInt.optional(),
});

// ── Crop body schemas ──

/** POST — upload one or more crops to an existing image */
export const CreateCropBodySchema = z.object({
  crops: z.array(CropMappingSchema).min(1),
});

/** PATCH — optionally change crop type and/or replace the file */
export const PatchCropBodySchema = CropSchema.pick({
  type: true,
}).partial();

/** PUT — replace crop type + file */
export const ReplaceCropBodySchema = CropSchema.pick({
  type: true,
});

/** FETCH - search query for crops*/
export const CropListQuerySchema = z.object({
  oldId: stringToInt.optional(),
});