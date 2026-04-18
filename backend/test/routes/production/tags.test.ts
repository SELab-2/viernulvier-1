import { describe, test, expect, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { syncProductionTags } from "@/routes/production/handlers/tags.js";

type QueryMock = ReturnType<typeof vi.fn>;

function makeServer(query: QueryMock): FastifyInstance {
  return {
    pg: { query },
  } as unknown as FastifyInstance;
}

describe("syncProductionTags", () => {
  test("returns early when tags are undefined", async () => {
    const query = vi.fn();
    const server = makeServer(query);

    await syncProductionTags(server, 42, undefined);

    expect(query).not.toHaveBeenCalled();
  });

  test("deletes links and exits when normalized tags are empty", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const server = makeServer(query);

    await syncProductionTags(server, 42, [0, -1, Number.NaN]);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      "DELETE FROM production_tag WHERE production = $1",
      [42],
    );
  });

  test("deletes and inserts normalized unique tags", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const server = makeServer(query);

    await syncProductionTags(server, 42, [5, 5, -3, 7, Number.NaN, 0]);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM production_tag WHERE production = $1",
      [42],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      `INSERT INTO production_tag (production, tag)
     SELECT $1, unnest($2::int[])
     ON CONFLICT DO NOTHING`,
      [42, [5, 7]],
    );
  });
});
