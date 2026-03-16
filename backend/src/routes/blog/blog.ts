import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchBlogs, fetchBlog, fetchBlogWithMeta, createBlog, replaceBlog, editBlog, deleteBlog } from "./handlers/index.js";

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
  const protect = { preHandler: [server.authorize] };

  server.get("/api/v1/blog", replyHandler(server, fetchBlogs));
  server.get("/api/v1/blog/:id", replyHandler(server, fetchBlog));
  server.get("/api/v1/blog/:id/meta", protect, replyHandler(server, fetchBlogWithMeta));
  server.post("/api/v1/blog", protect, replyHandler(server, createBlog));
  server.put("/api/v1/blog/:id", protect, replyHandler(server, replaceBlog));
  server.patch("/api/v1/blog/:id", protect, replyHandler(server, editBlog));
  server.delete("/api/v1/blog/:id", protect, replyHandler(server, deleteBlog));
}
