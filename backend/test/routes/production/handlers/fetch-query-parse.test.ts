import type { FastifyInstance, FastifyRequest } from "fastify";
import { expect, test, vi, beforeEach } from "vitest";
import { HttpClientError, HttpError } from "@/routes/helpers.js";
import { fetchProductions } from "@/routes/production/handlers/fetch.js";
import { ProductionListQuerySchema } from "@/routes/production/helpers/pagination.js";

const server = {
  log: { error: vi.fn() },
  pg: { query: vi.fn() },
} as unknown as FastifyInstance;

beforeEach(() => {
  vi.restoreAllMocks();
});

test("fetchProductions uses fallback message when the first issue omits message", async () => {
  vi.spyOn(ProductionListQuerySchema, "safeParse").mockReturnValue({
    success: false,
    error: {
      issues: [{ path: [], message: undefined }],
    },
  } as never);

  await expect(
    fetchProductions(server, { query: {} } as unknown as FastifyRequest),
  ).rejects.toSatisfy(
    (err: unknown) =>
      err instanceof HttpError &&
      err.status === HttpClientError.BadRequest &&
      err.message === "Invalid request data" &&
      err.code === undefined,
  );
});
