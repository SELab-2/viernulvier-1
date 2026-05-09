import { describe, expect, it, vi, afterEach } from "vitest";

import { processProductionMediaGallery } from "@/scraper/entities/media/image.js";

const AUTH_TOKEN = "auth-token";
const LOGIN_TOKEN = "login-token";
const PRODUCTION_ID = 1;

describe("processProductionMediaGallery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when the gallery has no items", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ "@id": "/api/v1/galleries/1", items: [] }), {
        status: 200,
      }),
    );

    // Should resolve without throwing and without extra fetch calls
    await expect(
      processProductionMediaGallery(
        "/api/v1/galleries/1",
        PRODUCTION_ID,
        AUTH_TOKEN,
        LOGIN_TOKEN,
      ),
    ).resolves.toBeUndefined();
  });

  it("skips gracefully when the gallery fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    await expect(
      processProductionMediaGallery(
        "/api/v1/galleries/2",
        PRODUCTION_ID,
        AUTH_TOKEN,
        LOGIN_TOKEN,
      ),
    ).resolves.toBeUndefined();
  });

  it("creates an image for each item in the gallery", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      // Gallery fetch
      if (url.includes("/api/v1/galleries/3")) {
        return new Response(
          JSON.stringify({
            "@id": "/api/v1/galleries/3",
            items: [
              {
                "@id": "/api/v1/media/items/10",
                "@type": "MediaItem",
                type: "foto",
                width: 1920,
                height: 1080,
                crops: [],
              },
            ],
          }),
          { status: 200 },
        );
      }

      // Local image existence check — not yet imported
      if (url.includes("/api/v1/image") && method === "GET") {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      // Image creation
      if (url.includes("/api/v1/production/") && url.includes("/image") && method === "POST") {
        return new Response(JSON.stringify({ id: 77 }), { status: 201 });
      }

      return new Response("not found", { status: 404 });
    });

    await processProductionMediaGallery(
      "/api/v1/galleries/3",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const calls = (global.fetch as ReturnType<typeof vi.spyOn>).mock.calls;
    const postCall = calls.find(([, init]: [unknown, RequestInit?]) => init?.method === "POST");
    expect(postCall).toBeDefined();
  });
});
