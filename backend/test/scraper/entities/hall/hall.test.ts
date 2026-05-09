import { describe, expect, it, vi, afterEach } from "vitest";

import { scrapeHallById, fetchLocalHallIdByOldId } from "@/scraper/entities/hall/hall.js";

describe("fetchLocalHallIdByOldId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no hall exists locally", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    expect(await fetchLocalHallIdByOldId(99)).toBeNull();
  });

  it("returns the id when a hall exists locally", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 7, old_id: 99, name: "Grote Zaal" }]), {
        status: 200,
      }),
    );

    expect(await fetchLocalHallIdByOldId(99)).toBe(7);
  });
});

describe("scrapeHallById", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns existing local id without hitting Viernulvier", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 7, old_id: 5, name: "Grote Zaal" }]), {
        status: 200,
      }),
    );

    const id = await scrapeHallById(5, "auth-token");
    expect(id).toBe(7);
  });

  it("returns null when Viernulvier responds with 404", async () => {
    vi.spyOn(global, "fetch")
      // local existence check — not found
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      // Viernulvier fetch — 404
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const id = await scrapeHallById(999, "auth-token");
    expect(id).toBeNull();
  });

  it("creates and returns a new local hall id", async () => {
    vi.spyOn(global, "fetch")
      // local existence check — not found
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      // Viernulvier hall fetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ "@id": "/api/v1/halls/5", name: "Kleine Zaal" }),
          { status: 200 },
        ),
      )
      // space fetch (hall has no space) — skip; POST hall directly
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 55 }), { status: 201 }));

    const id = await scrapeHallById(5, "auth-token", "login-token");
    expect(id).toBe(55);
  });
});
