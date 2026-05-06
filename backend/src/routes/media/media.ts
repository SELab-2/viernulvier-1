import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import {
  fetchImagesByProduction,
  fetchImage,
  fetchImageWithMeta,
  createImage,
  replaceImage,
  editImage,
  deleteImage,
  fetchCropsByImage,
  fetchCropByType,
  createCrops,
  editCrop,
  replaceCrop,
  deleteCrop,
} from "./handlers/index.js";
import cropProxyRoute from "./proxy.js";

/**
 * Registers media (image + crop) routes on the Fastify instance.
 *
 * @remarks
 * **Images**
 * - `GET    /api/v1/production/:productionId/image`  — list images (with crops) for a production
 * - `GET    /api/v1/image/:id`                        — single image with its crops
 * - `GET    /api/v1/image/:id/meta`                   — single image with metadata 🔒
 * - `POST   /api/v1/production/:productionId/image`   — create image (+ oneshot crops via multipart) 🔒
 * - `PATCH  /api/v1/image/:id`                        — edit image metadata 🔒
 * - `PUT    /api/v1/image/:id`                        — replace image metadata (+ optionally all crops) 🔒
 * - `DELETE /api/v1/image/:id`                        — delete image + cascade crops from S3 & DB 🔒
 *
 * **Crops**
 * - `GET    /api/v1/image/:imageId/crop`              — list crops for an image
 * - `GET    /api/v1/image/:imageId/crop/:type`        — single crop by type (unique per image)
 * - `POST   /api/v1/image/:imageId/crop`              — upload crop(s) to existing image (multipart) 🔒
 * - `PATCH  /api/v1/crop/:id`                         — edit crop metadata and/or replace file 🔒
 * - `PUT    /api/v1/crop/:id`                         — replace crop entirely 🔒
 * - `DELETE /api/v1/crop/:id`                         — delete single crop from S3 & DB 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function mediaRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize()] };

  // ── Images ──
  server.get("/api/v1/production/:productionId/image", replyHandler(server, fetchImagesByProduction));
  server.get("/api/v1/image/:id", replyHandler(server, fetchImage));
  server.get("/api/v1/image/:id/meta", protect, replyHandler(server, fetchImageWithMeta));
  server.post("/api/v1/production/:productionId/image", protect, replyHandler(server, createImage));
  server.patch("/api/v1/image/:id", protect, replyHandler(server, editImage));
  server.put("/api/v1/image/:id", protect, replyHandler(server, replaceImage));
  server.delete("/api/v1/image/:id", protect, replyHandler(server, deleteImage));

  // ── Crops ──
  server.get("/api/v1/image/:imageId/crop", replyHandler(server, fetchCropsByImage));
  server.get("/api/v1/image/:imageId/crop/:type", replyHandler(server, fetchCropByType));
  server.post("/api/v1/image/:imageId/crop", protect, replyHandler(server, createCrops));
  server.patch("/api/v1/crop/:id", protect, replyHandler(server, editCrop));
  server.put("/api/v1/crop/:id", protect, replyHandler(server, replaceCrop));
  server.delete("/api/v1/crop/:id", protect, replyHandler(server, deleteCrop));

  cropProxyRoute(server);
}