import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchBlogs, fetchBlog, fetchBlogWithMeta, createBlog, replaceBlog, editBlog, deleteBlog } from "./handlers/index.js";
import { createBlogDocs } from "./docs/create.js";
import { fetchBlogsDocs, fetchBlogDocs, fetchBlogWithMetaDocs } from "./docs/fetch.js";
import { deleteBlogDocs } from "./docs/delete.js";
import { editBlogDocs } from "./docs/edit.js";
import { replaceBlogDocs } from "./docs/replace.js";

/**
 * Registers blog routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/blog` — fetch a list of blogs.
 * - `GET /api/v1/blog/:id` — fetch a single blog by ID.
 * - `GET /api/v1/blog/:id/meta` — fetch a single blog with metadata by ID. 🔒
 * - `POST /api/v1/blog` — create a new blog. 🔒
 * - `PUT /api/v1/blog/:id` — replace an existing blog's data. 🔒
 * - `PATCH /api/v1/blog/:id` — partially update an existing blog. 🔒
 * - `DELETE /api/v1/blog/:id` — delete a blog by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function blogRoutes(server: FastifyInstance) {
  const protect = { preValidation: [server.authorize()] };

  server.get(
    "/api/v1/blog",
    { schema: fetchBlogsDocs },
    replyHandler(server, fetchBlogs),
  );
  server.get(
    "/api/v1/blog/:id",
    {schema: fetchBlogDocs},
    replyHandler(server, fetchBlog),
  );
  server.get(
    "/api/v1/blog/:id/meta",
    {...protect, schema: fetchBlogWithMetaDocs},
    replyHandler(server, fetchBlogWithMeta),
  );
  server.post(
    "/api/v1/blog",
    { ...protect, schema: createBlogDocs },
    replyHandler(server, createBlog),
  );
  server.put(
    "/api/v1/blog/:id",
    {...protect, schema: replaceBlogDocs},
    replyHandler(server, replaceBlog,

    ));
  server.patch(
    "/api/v1/blog/:id",
    {...protect, schema: editBlogDocs},
    replyHandler(server, editBlog),
  );
  server.delete(
    "/api/v1/blog/:id",
    {...protect, schema: deleteBlogDocs},
    replyHandler(server, deleteBlog),
  );
}
