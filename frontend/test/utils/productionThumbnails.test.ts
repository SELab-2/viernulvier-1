import { describe, it, expect } from "vitest";
import {
  pickProductionDetailBannerUrl,
  pickProductionListThumbnailUrl,
} from "@/utils/productionThumbnails";
import type { ImageWithCrops } from "@/services/media";

describe("pickProductionListThumbnailUrl", () => {
  it("returns null for empty list", () => {
    expect(pickProductionListThumbnailUrl([])).toBeNull();
  });

  it("prefers type banner over thumbnail-like crops", () => {
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
            type: "thumbnail",
            url: "/media/crops/b.jpg",
          },
          {
            id: 2,
            old_id: null,
            image: 1,
            type: "banner",
            url: "/media/crops/banner.jpg",
          },
        ],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/media/crops/banner.jpg");
  });

  it("prefers a thumbnail-like crop when no banner exists", () => {
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

describe("pickProductionDetailBannerUrl", () => {
  it("returns null for empty list", () => {
    expect(pickProductionDetailBannerUrl([])).toBeNull();
  });

  it("returns null when the first image has no crops", () => {
    const images: ImageWithCrops[] = [
      { id: 1, old_id: null, production: 1, res: null, crops: [] },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBeNull();
  });

  it("prefers hd_ready on the first gallery image (full-res master)", () => {
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
            type: "nb_header",
            url: "/media/crops/nbh.jpg",
          },
          {
            id: 2,
            old_id: null,
            image: 1,
            type: "hd_ready",
            url: "/media/crops/hd.jpg",
          },
        ],
      },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBe("/media/crops/hd.jpg");
  });

  it("uses the first image only, not a later one with a better type", () => {
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
            type: "cms",
            url: "/media/crops/cms.jpg",
          },
        ],
      },
      {
        id: 2,
        old_id: null,
        production: 1,
        res: null,
        crops: [
          {
            id: 2,
            old_id: null,
            image: 2,
            type: "hd_ready",
            url: "/media/crops/hd2.jpg",
          },
        ],
      },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBe("/media/crops/cms.jpg");
  });

  it("falls back to nb_header when the first image has no higher-priority type", () => {
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
            type: "nb_header",
            url: "/media/crops/header.jpg",
          },
        ],
      },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBe("/media/crops/header.jpg");
  });
});
