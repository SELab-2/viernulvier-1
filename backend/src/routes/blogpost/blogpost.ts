import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchBlogPosts, fetchBlogPost, fetchBlogPostWithMeta, createBlogPost, replaceBlogPost, editBlogPost, deleteBlogPost } from "./handlers/index.js";
import { replaceBlogPostDocs, fetchBlogPostDocs, fetchBlogPostsDocs, fetchBlogPostWithMetaDocs, createBlogPostDocs, deleteBlogPostDocs, editBlogPostDocs } from "./docs/index.js";

/**
 * Registers blogpost routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/blog/post` — fetch a list of blogposts.
 * - `GET /api/v1/blog/post/:id` — fetch a single blogpost by ID.
 * - `GET /api/v1/blog/post/:id/meta` — fetch a single blogpost with metadata by ID. 🔒
 * - `POST /api/v1/blog/post` — create a new blogpost. 🔒
 * - `PUT /api/v1/blog/post/:id` — replace an existing blogpost's data. 🔒
 * - `PATCH /api/v1/blog/post/:id` — partially update an existing blogpost. 🔒
 * - `DELETE /api/v1/blog/post/:id` — delete a blogpost by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function blogPostRoutes(server: FastifyInstance) {
  const protect = { preValidation: [server.authorize()] };

  server.get(
    "/api/v1/blog/post",
    {schema: fetchBlogPostsDocs },
    replyHandler(server, fetchBlogPosts),
  );
  server.get(
    "/api/v1/blog/post/:id", {schema: fetchBlogPostDocs },
    replyHandler(server, fetchBlogPost),
  );
  server.get(
    "/api/v1/blog/post/:id/meta", { ...protect, schema: fetchBlogPostWithMetaDocs },
    replyHandler(server, fetchBlogPostWithMeta),
  );
  server.post(
    "/api/v1/blog/post",
    {...protect, schema: createBlogPostDocs },
    replyHandler(server, createBlogPost),
  );
  server.put(
    "/api/v1/blog/post/:id",
    { ...protect, schema: replaceBlogPostDocs },
    replyHandler(server, replaceBlogPost),
  );
  server.patch(
    "/api/v1/blog/post/:id",
    { ...protect, schema: editBlogPostDocs },
    replyHandler(server, editBlogPost),
  );
  server.delete(
    "/api/v1/blog/post/:id",
    { ...protect, schema: deleteBlogPostDocs },
    replyHandler(server, deleteBlogPost),
  );
}
