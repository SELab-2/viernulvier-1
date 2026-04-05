import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchBlogPosts, fetchBlogPost, fetchBlogPostWithMeta, createBlogPost, replaceBlogPost, editBlogPost, deleteBlogPost } from "./handlers/index.js";

/**
 * Registers blogpost routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/blogpost` — fetch a list of blogposts.
 * - `GET /api/v1/blogpost/:id` — fetch a single blogpost by ID.
 * - `GET /api/v1/blogpost/:id/meta` — fetch a single blogpost with metadata by ID. 🔒
 * - `POST /api/v1/blogpost` — create a new blogpost. 🔒
 * - `PUT /api/v1/blogpost/:id` — replace an existing blogpost's data. 🔒
 * - `PATCH /api/v1/blogpost/:id` — partially update an existing blogpost. 🔒
 * - `DELETE /api/v1/blogpost/:id` — delete a blogpost by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function blogPostRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize()] };

  server.get("/api/v1/blogpost", replyHandler(server, fetchBlogPosts));
  server.get("/api/v1/blogpost/:id", replyHandler(server, fetchBlogPost));
  server.get("/api/v1/blogpost/:id/meta", protect, replyHandler(server, fetchBlogPostWithMeta));
  server.post("/api/v1/blogpost", protect, replyHandler(server, createBlogPost));
  server.put("/api/v1/blogpost/:id", protect, replyHandler(server, replaceBlogPost));
  server.patch("/api/v1/blogpost/:id", protect, replyHandler(server, editBlogPost));
  server.delete("/api/v1/blogpost/:id", protect, replyHandler(server, deleteBlogPost));
}
