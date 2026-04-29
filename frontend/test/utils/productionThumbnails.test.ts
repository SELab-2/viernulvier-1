import { describe, it, expect } from "vitest";
import {
  pickHighQualityImageCropUrl,
  pickProductionDetailBannerUrl,
  pickProductionListThumbnailUrl,
  PRODUCTION_DETAIL_BANNER_CROP_TYPE,
  PRODUCTION_GALLERY_SLIDE_CROP_TYPE,
  PRODUCTION_LIST_THUMB_CROP_TYPE,
} from "@/utils/productionThumbnails";
import type { ImageWithCrops } from "@/services/media";

function crop(type: string, url: string, imageId = 1, cropId = 1) {
  return {
    id: cropId,
    old_id: null,
    image: imageId,
    type,
    url,
  };
}

describe("pickProductionListThumbnailUrl", () => {
  it("returns null for empty list", () => {
    expect(pickProductionListThumbnailUrl([])).toBeNull();
  });

  it("skips an image with no crops and uses the next when it has FE3_header", () => {
    const images: ImageWithCrops[] = [
      { id: 1, old_id: null, production: 1, res: null, crops: [] },
      {
        id: 2,
        old_id: null,
        production: 1,
        res: null,
        crops: [crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/header.jpg", 2)],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/header.jpg");
  });

  it("does not fall back to other crop types when FE3_header is missing", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [
          crop(PRODUCTION_DETAIL_BANNER_CROP_TYPE, "/wide.jpg", 1),
          crop(PRODUCTION_GALLERY_SLIDE_CROP_TYPE, "/boxed.jpg", 1),
        ],
      },
      {
        id: 2,
        old_id: null,
        production: 1,
        res: null,
        crops: [crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/thumb.jpg", 2)],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/thumb.jpg");
  });

  it("returns FE3_header when present alongside other crops", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [
          crop(PRODUCTION_GALLERY_SLIDE_CROP_TYPE, "/boxed.jpg", 1, 1),
          crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/header.jpg", 1, 2),
        ],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/header.jpg");
  });

  it("returns null when no image has FE3_header", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [crop(PRODUCTION_DETAIL_BANNER_CROP_TYPE, "/wide.jpg", 1)],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBeNull();
  });

  it("skips FE3_header with empty url and tries later images", () => {
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
            type: PRODUCTION_LIST_THUMB_CROP_TYPE,
            url: "",
          },
        ],
      },
      {
        id: 2,
        old_id: null,
        production: 1,
        res: null,
        crops: [crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/ok.jpg", 2)],
      },
    ];
    expect(pickProductionListThumbnailUrl(images)).toBe("/ok.jpg");
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

  it("returns FE3_home_featuredWide from the first image only", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [
          crop(PRODUCTION_DETAIL_BANNER_CROP_TYPE, "/featured.jpg", 1),
          crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/header.jpg", 1, 2),
        ],
      },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBe("/featured.jpg");
  });

  it("does not use a later image when the first lacks FE3_home_featuredWide", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/header.jpg", 1)],
      },
      {
        id: 2,
        old_id: null,
        production: 1,
        res: null,
        crops: [crop(PRODUCTION_DETAIL_BANNER_CROP_TYPE, "/featured2.jpg", 2)],
      },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBeNull();
  });

  it("returns null when first image has crops but not FE3_home_featuredWide", () => {
    const images: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 1,
        res: null,
        crops: [
          crop("hd_ready", "/hd.jpg", 1),
          crop(PRODUCTION_GALLERY_SLIDE_CROP_TYPE, "/boxed.jpg", 1, 2),
        ],
      },
    ];
    expect(pickProductionDetailBannerUrl(images)).toBeNull();
  });
});

describe("pickHighQualityImageCropUrl", () => {
  it("returns FE3_boxed only", () => {
    const image: ImageWithCrops = {
      id: 1,
      old_id: null,
      production: 1,
      res: null,
      crops: [
        crop("hd_ready", "/hd.jpg", 1, 1),
        crop(PRODUCTION_GALLERY_SLIDE_CROP_TYPE, "/boxed.jpg", 1, 2),
      ],
    };
    expect(pickHighQualityImageCropUrl(image)).toBe("/boxed.jpg");
  });

  it("returns null when FE3_boxed is absent even if other types exist", () => {
    const image: ImageWithCrops = {
      id: 1,
      old_id: null,
      production: 1,
      res: null,
      crops: [
        crop("hd_ready", "/hd.jpg", 1),
        crop(PRODUCTION_LIST_THUMB_CROP_TYPE, "/header.jpg", 1, 2),
      ],
    };
    expect(pickHighQualityImageCropUrl(image)).toBeNull();
  });

  it("returns null when there are no crops", () => {
    const image = {
      id: 1,
      old_id: null,
      production: 1,
      res: null,
      crops: [],
    };
    expect(pickHighQualityImageCropUrl(image)).toBeNull();
  });

  it("treats missing crops as empty", () => {
    const image = {
      id: 1,
      old_id: null,
      production: 1,
      res: null,
    } as ImageWithCrops;
    expect(pickHighQualityImageCropUrl(image)).toBeNull();
  });

  it("returns null when FE3_boxed url is empty", () => {
    const image: ImageWithCrops = {
      id: 1,
      old_id: null,
      production: 1,
      res: null,
      crops: [
        {
          id: 1,
          old_id: null,
          image: 1,
          type: PRODUCTION_GALLERY_SLIDE_CROP_TYPE,
          url: "",
        },
        crop("hd_ready", "/hd.jpg", 1, 2),
      ],
    };
    expect(pickHighQualityImageCropUrl(image)).toBeNull();
  });
});
