import type { FastifyInstance, FastifyRequest } from "fastify";
import { HttpServerError, HttpError } from "@/routes/helpers.js";

export async function editImage(_server: FastifyInstance, _request: FastifyRequest): Promise<never> {
  throw new HttpError(HttpServerError.NotImplemented, "Not implemented");
}

export async function editCrop(_server: FastifyInstance, _request: FastifyRequest): Promise<never> {
  throw new HttpError(HttpServerError.NotImplemented, "Not implemented");
}