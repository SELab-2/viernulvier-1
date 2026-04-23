import { describe, it, expect } from "vitest";
import { pickProductionListThumbnailUrl } from "@/utils/productionThumbnails";
import type { ImageWithCrops } from "@/services/media";

describe("pickProductionListThumbnailUrl", () => {
  it("returns null for empty list", () => {
    expect(pickProductionListThumbnailUrl([])).toBeNull();
  });

  it("prefers a thumbnail-like crop type", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [
          {
            id: 1,
            old_id: null,
            image: 1,
            type: "full",
            url: "/media/crops/a.jpg",
          },
          {
            id: 2,
            old_id: null,
            image: 1,
            type: "thumbnail",
            url: "/media/crops/b.jpg",
          },
        ],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/media/crops/b.jpg");
  });

  it("falls back to the first crop", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: "1920x1080",
        crops: [
          {
            id: 1,
            old_id: null,
            image: 1,
            type: "default",
            url: "/media/crops/c.jpg",
          },
        ],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/media/crops/c.jpg");
  });
});
