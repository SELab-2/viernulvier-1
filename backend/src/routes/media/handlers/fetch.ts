import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Crop, CropWithMeta, Image, ImageWithMeta } from "@viernulvier/shared/index.js";
import { ImageSchema, CropSchema, serial } from "@viernulvier/shared/index.js";
import { parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import z from "zod";
import { CropListQuerySchema, ImageListQuerySchema } from "./body-schema.js";

// ── SQL fragments ──

const ImageSelect = `
SELECT
  i.id,
  i.old_id,
  i.production,
  i.res
FROM image i
`;

const ImageSelectWithMeta = `
SELECT
  i.id,
  i.old_id,
  i.production,
  i.res,
  i.created_at,
  i.created_by,
  i.updated_at,
  i.updated_by
FROM image i
`;

const CropSelect = `
SELECT
  c.id,
  c.old_id,
  c.image,
  c.url,
  c.type
FROM crop c
`;

const CropSelectWithMeta = `
SELECT
  c.id,
  c.old_id,
  c.image,
  c.url,
  c.type,
  c.created_at,
  c.created_by,
  c.updated_at,
  c.updated_by
FROM crop c
`;

// ── Internal helpers ──

/**
 * Internal helper: fetches crops for a set of images and attaches them.
 */
async function attachCropsToImages(
  server: FastifyInstance,
  images: Image[],
): Promise<(Image & { crops: Crop[] })[]> {
  if (images.length === 0) return [];

  const imageIds = images.map((img) => img.id);
  const cropsResult = await server.pg.query(
    `${CropSelect} WHERE c.image = ANY($1::int[]) ORDER BY c.image ASC, c.id ASC`,
    [imageIds],
  );
  const allCrops = parseSchema(server, z.array(CropSchema), cropsResult.rows, ParseContext.Database);

  const cropsByImage = new Map<number, Crop[]>();
  for (const crop of allCrops) {
    const imageId = crop.image as number;
    const list = cropsByImage.get(imageId) ?? [];
    list.push(crop);
    cropsByImage.set(imageId, list);
  }

  return images.map((img) => ({
    ...img,
    crops: cropsByImage.get(img.id) ?? [],
  }));
}

/**
 * Fetches a single image by old_id (without metadata).
 *
 * @param server - The Fastify instance.
 * @param oldId - The old_id from the external source.
 * @returns The image with crops or `null` if not found.
 */
export async function getImageByOldId(
  server: FastifyInstance,
  oldId: number,
): Promise<(Image & { crops: Crop[] }) | null> {
  const imgResult = await server.pg.query(
    `${ImageSelect} WHERE i.old_id = \$1`,
    [oldId],
  );
  const images = parseSchema(server, z.array(ImageSchema), imgResult.rows, ParseContext.Database);
  if (images.length === 0) return null;

  const withCrops = await attachCropsToImages(server, images);
  return withCrops[0] ?? null;
}

/**
 * Fetches a single image by ID (without metadata).
 *
 * @param server - The Fastify instance.
 * @param id - The image ID.
 * @returns The image or `null` if not found.
 */
export async function getImageById(
  server: FastifyInstance,
  id: number | string,
): Promise<(Image & { crops: Crop[] }) | null> {
  const imgResult = await server.pg.query(
    `${ImageSelect} WHERE i.id = \$1`,
    [id],
  );
  const images = parseSchema(server, z.array(ImageSchema), imgResult.rows, ParseContext.Database);
  const image = images[0];
  if (!image) return null;

  const cropsResult = await server.pg.query(
    `${CropSelect} WHERE c.image = $1 ORDER BY c.id ASC`,
    [image.id],
  );
  const crops = parseSchema(server, z.array(CropSchema), cropsResult.rows, ParseContext.Database);

  return { ...image, crops };
}

/**
 * Fetches crops for a given image ID.
 *
 * @param server - The Fastify instance.
 * @param imageId - The image ID.
 * @returns Array of crops.
 */
export async function getCropsByImageId(
  server: FastifyInstance,
  imageId: number | string,
): Promise<Crop[]> {
  const result = await server.pg.query(
    `${CropSelect} WHERE c.image = $1 ORDER BY c.id ASC`,
    [imageId],
  );
  return parseSchema(server, z.array(CropSchema), result.rows, ParseContext.Database);
}

/**
 * Fetches a single crop by ID.
 *
 * @param server - The Fastify instance.
 * @param id - The crop ID.
 * @returns The crop or `null` if not found.
 */
export async function getCropById(
  server: FastifyInstance,
  id: number | string,
): Promise<Crop | null> {
  const result = await server.pg.query(
    `${CropSelect} WHERE c.id = $1`,
    [id],
  );
  const crops = parseSchema(server, z.array(CropSchema), result.rows, ParseContext.Database);
  return crops[0] ?? null;
}

// ── Route handlers ──

/**
 * GET /api/v1/production/:productionId/image
 *
 * Fetches all images (with their crops) for a production.
 */
export async function fetchImagesByProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] })[] | null> {
  const { productionId } = parseParams(request, z.object({ productionId: serial() }));

  const imgResult = await server.pg.query(
    `${ImageSelect} WHERE i.production = $1 ORDER BY i.id ASC`,
    [productionId],
  );
  const images = parseSchema(server, z.array(ImageSchema), imgResult.rows, ParseContext.Database);

  if (images.length === 0) return [];

  const imageIds = images.map((img) => img.id);
  const cropsResult = await server.pg.query(
    `${CropSelect} WHERE c.image = ANY($1::int[]) ORDER BY c.image ASC, c.id ASC`,
    [imageIds],
  );
  const allCrops = parseSchema(server, z.array(CropSchema), cropsResult.rows, ParseContext.Database);

  const cropsByImage = new Map<number, Crop[]>();
  for (const crop of allCrops) {
    const imageId = crop.image as number;
    const list = cropsByImage.get(imageId) ?? [];
    list.push(crop);
    cropsByImage.set(imageId, list);
  }

  return images.map((img) => ({
    ...img,
    crops: cropsByImage.get(img.id) ?? [],
  }));
}

/**
 * GET /api/v1/image
 *
 * Query modes (mutually exclusive; order of precedence: `oldId` → paged `page` → list all):
 *
 * - `?oldId=` (numeric): images whose `old_id` matches; returns an array of
 *   length 0 or 1 (with crops on each item).
 * - `?page=` (numeric) and optional `?pageSize=` (default page size `100` when
 *   `page` is set) — paged list; returns `{ totalItems, member }`, where
 *   `member` is the page slice of images with crops, ordered by image id.
 * - No `oldId` and no `page`: every image in the table as an array (with crops)
 *
 * @param server - The Fastify instance.
 * @param request - The incoming request; query parsed with {@link ImageListQuerySchema}.
 * @returns Either a plain list of images with crops, or a Hydra-style paged object.
 */
export async function fetchAllImages(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<
  | (Image & { crops: Crop[] })[]
  | { totalItems: number; member: (Image & { crops: Crop[] })[] }
> {
  const { oldId, page, pageSize: rawPageSize } = parseSchema(
    server,
    ImageListQuerySchema,
    request.query,
    ParseContext.Request,
  );
  if (oldId !== undefined) {
    const image = await getImageByOldId(server, oldId);
    return await attachCropsToImages(server, image ? [image] : []);
  }
  if (page !== undefined) {
    const pageSize = rawPageSize ?? 100;
    const offset = (page - 1) * pageSize;
    const countR = await server.pg.query<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM image i",
    );
    const totalItems = countR.rows[0]?.c ?? 0;
    const imgResult = await server.pg.query(
      `${ImageSelect} ORDER BY i.id ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    const images = parseSchema(
      server,
      z.array(ImageSchema),
      imgResult.rows,
      ParseContext.Database,
    );
    const member = await attachCropsToImages(server, images);
    return { totalItems, member };
  }
  const imgResult = await server.pg.query(
    `${ImageSelect} ORDER BY i.id ASC`,
  );
  const images = parseSchema(server, z.array(ImageSchema), imgResult.rows, ParseContext.Database);
  return await attachCropsToImages(server, images);
}


/**
 * GET /api/v1/image/:id
 *
 * Fetches a single image with its crops.
 */
export async function fetchImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] }) | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  return await getImageById(server, id);
}

/**
 * GET /api/v1/image/:id/meta
 *
 * Fetches a single image with metadata and its crops (with metadata).
 */
export async function fetchImageWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(ImageWithMeta & { crops: CropWithMeta[] }) | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));

  const imgResult = await server.pg.query(
    `${ImageSelectWithMeta} WHERE i.id = $1`,
    [id],
  );
  const images = parseSchema(
    server,
    z.array(ImageSchema.withMeta()),
    imgResult.rows,
    ParseContext.Database,
  );
  const image = images[0];
  if (!image) return null;

  const cropsResult = await server.pg.query(
    `${CropSelectWithMeta} WHERE c.image = $1 ORDER BY c.id ASC`,
    [id],
  );
  const crops = parseSchema(
    server,
    z.array(CropSchema.withMeta()),
    cropsResult.rows,
    ParseContext.Database,
  );

  return { ...image, crops };
}

/**
 * GET /api/v1/image/:imageId/crop
 * Can filter by the old_id of the crop via query param (`?oldId=X`).
 * If `oldId` is provided, returns an array with a single crop or an empty array if not found.
 * If `oldId` is not provided, returns all crops for the given image.
 */
export async function fetchCropsByImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop[] | null> {
  const { imageId } = parseParams(request, z.object({ imageId: serial() }));
  const { oldId } = parseSchema(server, CropListQuerySchema, request.query, ParseContext.Request);
  if (oldId !== undefined) {
    const crop = await server.pg.query(
      `${CropSelect} WHERE c.image = $1 AND c.old_id = $2`,
      [imageId, oldId],
    );
    const crops = parseSchema(server, z.array(CropSchema), crop.rows, ParseContext.Database);
    return crops;
  }
  return await getCropsByImageId(server, imageId);
}

/**
 * GET /api/v1/image/:imageId/crop/:type
 *
 * Fetches a single crop by its type (unique per image).
 */
export async function fetchCropByType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop | null> {
  const { imageId, type } = parseParams(
    request,
    z.object({ imageId: serial(), type: z.string().min(1).max(32) }),
  );

  const result = await server.pg.query(
    `${CropSelect} WHERE c.image = $1 AND c.type = $2`,
    [imageId, type],
  );
  const crops = parseSchema(server, z.array(CropSchema), result.rows, ParseContext.Database);
  return crops[0] ?? null;
}