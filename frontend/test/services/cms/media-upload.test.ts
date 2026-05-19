import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Crop } from "@viernulvier/shared";

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/services/cms/crop-generator", () => ({
  generateAllCrops: vi.fn(),
}));

import { apiFetch } from "@/services/api";
import { generateAllCrops } from "@/services/cms/crop-generator";
import { uploadCrops, uploadImageWithCrops } from "@/services/cms/media-upload";

describe("cms/media-upload", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it("uploads image data together with generated crops", async () => {
    const imageBlob = new Blob(["image"], { type: "image/jpeg" });
    const cropOne = { blob: new Blob(["crop-one"], { type: "image/jpeg" }), type: "cms", filename: "crop-cms-1.jpg" };
    const cropTwo = {
      blob: new Blob(["crop-two"], { type: "image/jpeg" }),
      type: "cms_wide",
      filename: "crop-cms_wide-2.jpg",
    };

    vi.mocked(generateAllCrops).mockResolvedValue([cropOne, cropTwo]);
    fetchSpy.mockResolvedValue({ blob: vi.fn().mockResolvedValue(imageBlob) } as never);
    vi.mocked(apiFetch).mockResolvedValue({ id: 123, crops: [] } as never);

    const result = await uploadImageWithCrops(42, "data:image/png;base64,abc", "1920x1080");

    expect(generateAllCrops).toHaveBeenCalledWith("data:image/png;base64,abc");
    expect(fetchSpy).toHaveBeenCalledWith("data:image/png;base64,abc");
    expect(apiFetch).toHaveBeenCalledWith(
      "/production/42/image",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
    expect(result).toEqual({ id: 123, crops: [] });

    const options = vi.mocked(apiFetch).mock.calls[0]?.[1];
    const body = options?.body as FormData;
    const data = JSON.parse(String(body.get("data")));

    expect(data).toEqual({
      res: "1920x1080",
      crops: [
        { filename: "crop-cms-1.jpg", type: "cms" },
        { filename: "crop-cms_wide-2.jpg", type: "cms_wide" },
      ],
    });
    const imageEntry = body.get("image");
    const cropOneEntry = body.get("crop-cms-1.jpg");
    const cropTwoEntry = body.get("crop-cms_wide-2.jpg");

    expect(imageEntry).toBeInstanceOf(File);
    expect((imageEntry as File).name).toBe("image.jpg");
    expect(cropOneEntry).toBeInstanceOf(File);
    expect((cropOneEntry as File).name).toBe("crop-cms-1.jpg");
    expect(cropTwoEntry).toBeInstanceOf(File);
    expect((cropTwoEntry as File).name).toBe("crop-cms_wide-2.jpg");
  });

  it("omits the resolution when none is provided", async () => {
    const imageBlob = new Blob(["image"], { type: "image/jpeg" });

    vi.mocked(generateAllCrops).mockResolvedValue([]);
    fetchSpy.mockResolvedValue({ blob: vi.fn().mockResolvedValue(imageBlob) } as never);
    vi.mocked(apiFetch).mockResolvedValue({ id: 123, crops: [] } as never);

    await uploadImageWithCrops(42, "data:image/png;base64,abc");

    const options = vi.mocked(apiFetch).mock.calls[0]?.[1];
    const body = options?.body as FormData;
    const data = JSON.parse(String(body.get("data")));

    expect(data.res).toBeNull();
  });

  it("uploads crops for an existing image", async () => {
    const crops = [
      { blob: new Blob(["crop-one"], { type: "image/jpeg" }), type: "cms", filename: "crop-cms-1.jpg" },
      { blob: new Blob(["crop-two"], { type: "image/jpeg" }), type: "cms_thumbnail", filename: "crop-cms_thumbnail-2.jpg" },
    ] satisfies Array<{ blob: Blob; type: string; filename: string }>;

    vi.mocked(apiFetch).mockResolvedValue([{ id: 55, image: 9, type: "cms", url: "/media/crops/cms.jpg", old_id: null }] as Crop[]);

    const result = await uploadCrops(9, crops);

    expect(apiFetch).toHaveBeenCalledWith(
      "/image/9/crop",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
    expect(result).toEqual([{ id: 55, image: 9, type: "cms", url: "/media/crops/cms.jpg", old_id: null }]);

    const options = vi.mocked(apiFetch).mock.calls[0]?.[1];
    const body = options?.body as FormData;
    const data = JSON.parse(String(body.get("data")));

    expect(data).toEqual({
      crops: [
        { filename: "crop-cms-1.jpg", type: "cms" },
        { filename: "crop-cms_thumbnail-2.jpg", type: "cms_thumbnail" },
      ],
    });
    const cropOneEntry = body.get("crop-cms-1.jpg");
    const cropTwoEntry = body.get("crop-cms_thumbnail-2.jpg");

    expect(cropOneEntry).toBeInstanceOf(File);
    expect((cropOneEntry as File).name).toBe("crop-cms-1.jpg");
    expect(cropTwoEntry).toBeInstanceOf(File);
    expect((cropTwoEntry as File).name).toBe("crop-cms_thumbnail-2.jpg");
  });
});
