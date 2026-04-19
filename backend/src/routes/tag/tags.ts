import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTag,
  fetchTags,
  createTag,
  editTag,
  deleteTag,
  replaceTag,
  fetchTagWithMeta,
  fetchTagVisible,
  fetchTagsVisible,
} from "./handlers/index.js";

import {
  fetchTagDocs,
  fetchTagVisibleDocs,
  fetchTagWithMetaDocs,
  fetchTagsDocs,
  fetchTagsVisibleDocs,
  createTagDocs,
  editTagDocs,
  deleteTagDocs,
  replaceTagDocs,
} from "./docs/index.js";

/**
 * Registers tag routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/tag/all` — fetch tags (optional `production`, or `old_id` + `tag_type` together); includes non-public tags. 🔒
 * - `GET /api/v1/tag` — fetch public tags only (same query parameters as `GET /api/v1/tag/all`).
 * - `GET /api/v1/tag/:id/all` — fetch a single tag by ID (non-public allowed). 🔒
 * - `GET /api/v1/tag/:id` — fetch a single public tag by ID.
 * - `GET /api/v1/tag/:id/meta` — fetch a single tag with metadata by ID. 🔒
 * - `POST /api/v1/tag` — create a tag. 🔒
 * - `PUT /api/v1/tag/:id` — replace a tag. 🔒
 * - `PATCH /api/v1/tag/:id` — partially update a tag. 🔒
 * - `DELETE /api/v1/tag/:id` — delete a tag by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function tagRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize()] };

  server.get(
    "/api/v1/tag/all",
    {...protect, schema: fetchTagsDocs},
    replyHandler(server, fetchTags),
  );
  server.get(
    "/api/v1/tag",
    {schema: fetchTagVisibleDocs},
    replyHandler(server, fetchTagsVisible),
  );
  server.get(
    "/api/v1/tag/:id/all",
    {...protect, schema: fetchTagDocs},
    replyHandler(server, fetchTag),
  );
  server.get(
    "/api/v1/tag/:id",
    {schema: fetchTagVisibleDocs},
    replyHandler(server, fetchTagVisible),
  );
  server.get(
    "/api/v1/tag/:id/meta",
    { ...protect, schema: fetchTagWithMetaDocs },
    replyHandler(server, fetchTagWithMeta),
  );

  server.post(
    "/api/v1/tag",
    {...protect, schema: createTagDocs},
    replyHandler(server, createTag),
  );
  server.put(
    "/api/v1/tag/:id",
    {...protect, schema: replaceTagDocs},
    replyHandler(server, replaceTag),
  );
  server.patch(
    "/api/v1/tag/:id",
    {...protect, schema: editTagDocs},
    replyHandler(server, editTag),
  );
  server.delete(
    "/api/v1/tag/:id",
    {...protect, schema: deleteTagDocs},
    replyHandler(server, deleteTag),
  );
}