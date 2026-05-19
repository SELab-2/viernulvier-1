import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/services/api";
import { deleteImage, getImage, getImagesByProduction } from "@/services/images";

describe("services/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the production image endpoint for listing, fetching, and deleting", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce([{ id: 1, production: 42, crops: [] }])
      .mockResolvedValueOnce({ id: 2, production: 42, crops: [] })
      .mockResolvedValueOnce(undefined);

    await expect(getImagesByProduction(42)).resolves.toEqual([{ id: 1, production: 42, crops: [] }]);
    await expect(getImage(2)).resolves.toEqual({ id: 2, production: 42, crops: [] });
    await expect(deleteImage(2)).resolves.toBeUndefined();

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/production/42/image");
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/image/2");
    expect(apiFetch).toHaveBeenNthCalledWith(3, "/image/2", { method: "DELETE" });
  });
});
