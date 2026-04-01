import z from "zod";

// ── Crop-file mapping (used inside multipart "data" JSON field) ──

export const CropMappingSchema = z.object({
  filename: z.string().min(1),
  type: z.string().min(1).max(32),
});

// ── Image body schemas ──

/** POST — create image, optionally with crops in one multipart request */
export const CreateImageBodySchema = z.object({
  res: z.string().max(16).nullable().optional(),
  old_id: z.int().nonnegative().nullable().optional(),
  crops: z.array(CropMappingSchema).optional(),
});

/** PATCH — partially update image fields (res, old_id) */
export const PatchImageBodySchema = z.object({
  res: z.string().max(16).nullable().optional(),
  old_id: z.int().nonnegative().nullable().optional(),
});

/** PUT — fully replace image fields, optionally replace all crops */
export const ReplaceImageBodySchema = z.object({
  res: z.string().max(16).nullable(),
  old_id: z.int().nonnegative().nullable(),
  crops: z.array(CropMappingSchema).optional(),
});

// ── Crop body schemas ──

/** POST — upload one or more crops to an existing image */
export const CreateCropBodySchema = z.object({
  crops: z.array(CropMappingSchema).min(1),
});

/** PATCH — optionally change crop type and/or replace the file */
export const PatchCropBodySchema = z.object({
  type: z.string().min(1).max(32).optional(),
});

/** PUT — replace crop type + file */
export const ReplaceCropBodySchema = z.object({
  type: z.string().min(1).max(32),
});