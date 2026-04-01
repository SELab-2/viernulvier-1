import type { FastifyInstance, FastifyRequest } from "fastify";
import { HttpServerError, HttpError } from "@/routes/helpers.js";

export async function deleteImage(_server: FastifyInstance, _request: FastifyRequest): Promise<never> {
  throw new HttpError(HttpServerError.NotImplemented, "Not implemented");
}

export async function deleteCrop(_server: FastifyInstance, _request: FastifyRequest): Promise<never> {
  throw new HttpError(HttpServerError.NotImplemented, "Not implemented");
}