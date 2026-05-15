import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTagType,
  fetchTagTypes,
  createTagType,
  editTagType,
  deleteTagType,
  replaceTagType,
  fetchTagTypeWithMeta,
} from "./handlers/index.js";

import {
  fetchTagTypeDocs,
  fetchTagTypeWithMetaDocs,
  fetchTagTypesDocs,
  createTagTypeDocs,
  editTagTypeDocs,
  deleteTagTypeDocs,
  replaceTagTypeDocs,
} from "./docs/index.js";

/**
 * Registers tag type routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/tag/type` — fetch all tag types.
 * - `GET /api/v1/tag/type/:id` — fetch a single tag type by ID.
 * - `GET /api/v1/tag/type/:id/meta` — fetch a single tag type with metadata by ID. 🔒
 * - `POST /api/v1/tag/type` — create a tag type. 🔒
 * - `PATCH /api/v1/tag/type/:id` — partially update a tag type. 🔒
 * - `PUT /api/v1/tag/type/:id` — replace a tag type. 🔒
 * - `DELETE /api/v1/tag/type/:id` — delete a tag type by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function tagTypeRoutes(server: FastifyInstance) {
  const protect = { preValidation: [server.authorize()] };

  server.get(
    "/api/v1/tag/type",
    {schema: fetchTagTypesDocs },
    replyHandler(server, fetchTagTypes),
  );
  server.get(
    "/api/v1/tag/type/:id",
    {schema: fetchTagTypeDocs },
    replyHandler(server, fetchTagType),
  );
  server.get(
    "/api/v1/tag/type/:id/meta",
    { ...protect, schema: fetchTagTypeWithMetaDocs },
    replyHandler(server, fetchTagTypeWithMeta),
  );
  server.post(
    "/api/v1/tag/type",
    {...protect, schema: createTagTypeDocs },
    replyHandler(server, createTagType),
  );

  server.patch(
    "/api/v1/tag/type/:id",
    { ...protect, schema: editTagTypeDocs },
    replyHandler(server, editTagType),
  );
  server.put(
    "/api/v1/tag/type/:id",
    { ...protect, schema: replaceTagTypeDocs },
    replyHandler(server, replaceTagType),
  );

  server.delete(
    "/api/v1/tag/type/:id",
    { ...protect, schema: deleteTagTypeDocs },
    replyHandler(server, deleteTagType),
  );
}