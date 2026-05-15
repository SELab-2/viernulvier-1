import { describe, expect, it } from "vitest";

import {
  filterCropsByAllowList,
  SCRAPER_CROP_NAMES,
} from "@/scraper/entities/media/crop-types-config.js";

describe("crop-types-config", () => {
  it("SCRAPER_CROP_NAMES is non-empty", () => {
    expect(SCRAPER_CROP_NAMES.size).toBeGreaterThan(0);
  });

  it("filterCropsByAllowList keeps only listed names", () => {
    const crops = [{ name: "banner" }, { name: "unused_type" }];
    expect(filterCropsByAllowList(crops, new Set(["banner"]))).toEqual([
      { name: "banner" },
    ]);
  });
});
