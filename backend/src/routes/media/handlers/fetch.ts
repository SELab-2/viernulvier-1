import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Crop, CropWithMeta, Image, ImageWithMeta } from "@viernulvier/shared/index.js";
import { ImageSchema, CropSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import z from "zod";

// ── SQL fragments ──

const ImageSelect = `
SELECT
  i.id,
  i.old_id,
  i.production_id AS production,
  i.res
FROM image i
`;

const ImageSelectWithMeta = `
SELECT
  i.id,
  i.old_id,
  i.production_id AS production,
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
  c.image_id AS image,
  c.url,
  c.type
FROM crop c
`;

const CropSelectWithMeta = `
SELECT
  c.id,
  c.old_id,
  c.image_id AS image,
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
    `${CropSelect} WHERE c.image_id = \$1 ORDER BY c.id ASC`,
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
    `${CropSelect} WHERE c.image_id = \$1 ORDER BY c.id ASC`,
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
    `${CropSelect} WHERE c.id = \$1`,
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
  const { productionId } = parseParams(request, z.object({ productionId: stringToInt }));

  const imgResult = await server.pg.query(
    `${ImageSelect} WHERE i.production_id = \$1 ORDER BY i.id ASC`,
    [productionId],
  );
  const images = parseSchema(server, z.array(ImageSchema), imgResult.rows, ParseContext.Database);

  if (images.length === 0) return [];

  const imageIds = images.map((img) => img.id);
  const cropsResult = await server.pg.query(
    `${CropSelect} WHERE c.image_id = ANY(\$1::int[]) ORDER BY c.image_id ASC, c.id ASC`,
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
 * GET /api/v1/image/:id
 *
 * Fetches a single image with its crops.
 */
export async function fetchImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] }) | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
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
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const imgResult = await server.pg.query(
    `${ImageSelectWithMeta} WHERE i.id = \$1`,
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
    `${CropSelectWithMeta} WHERE c.image_id = \$1 ORDER BY c.id ASC`,
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
 *
 * Fetches all crops for a given image.
 */
export async function fetchCropsByImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop[] | null> {
  const { imageId } = parseParams(request, z.object({ imageId: stringToInt }));
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
    z.object({ imageId: stringToInt, type: z.string().min(1).max(32) }),
  );

  const result = await server.pg.query(
    `${CropSelect} WHERE c.image_id = \$1 AND c.type = \$2`,
    [imageId, type],
  );
  const crops = parseSchema(server, z.array(CropSchema), result.rows, ParseContext.Database);
  return crops[0] ?? null;
}