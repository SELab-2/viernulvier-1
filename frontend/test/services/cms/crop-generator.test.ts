import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CMS_CROP_DEFINITIONS,
  generateAllCrops,
  generateCrop,
} from "@/services/cms/crop-generator";

type CanvasContextMock = {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
};

class MockImage {
  static mode: "load" | "error" = "load";
  static naturalWidth = 2000;
  static naturalHeight = 1000;

  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  naturalWidth = MockImage.naturalWidth;
  naturalHeight = MockImage.naturalHeight;
  private source = "";

  set src(value: string) {
    this.source = value;
    if (MockImage.mode === "error") {
      this.onerror?.();
      return;
    }
    this.onload?.();
  }

  get src(): string {
    return this.source;
  }
}

function createCanvasMock(blobResult: Blob | null = new Blob(["crop"], { type: "image/jpeg" })) {
  const context: CanvasContextMock = {
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };

  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(blobResult)),
    __context: context,
  } as unknown as HTMLCanvasElement & { __context: CanvasContextMock };
}

describe("cms/crop-generator", () => {
  const originalCreateElement = document.createElement.bind(document);
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    MockImage.mode = "load";
    MockImage.naturalWidth = 2000;
    MockImage.naturalHeight = 1000;
    vi.stubGlobal("Image", MockImage);
    createElementSpy = vi.spyOn(document, "createElement");
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("exposes the CMS crop definitions", () => {
    expect(CMS_CROP_DEFINITIONS).toEqual([
      { type: "cms", width: 800, height: 600, fit: "cover" },
      { type: "cms_thumbnail", width: 300, height: 300, fit: "cover" },
      { type: "cms_wide", width: 1600, height: 900, fit: "cover" },
    ]);
  });

  it("generates a cover crop by trimming the sides of wider images", async () => {
    MockImage.naturalWidth = 2000;
    MockImage.naturalHeight = 1000;
    const canvas = createCanvasMock();
    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    const result = await generateCrop("data:image/png;base64,wide", {
      type: "cms",
      width: 800,
      height: 600,
      fit: "cover",
    });

    const context = canvas.__context;
    expect(result.type).toBe("cms");
    expect(result.filename).toMatch(/^crop-cms-/);
    expect(context.drawImage).toHaveBeenCalledTimes(1);

    const call = context.drawImage.mock.calls[0] as [MockImage, number, number, number, number, number, number, number, number];
    expect(call[1]).toBeCloseTo(333.333, 2);
    expect(call[2]).toBe(0);
    expect(call[3]).toBeCloseTo(1333.333, 2);
    expect(call[4]).toBe(1000);
    expect(call[5]).toBe(0);
    expect(call[6]).toBe(0);
    expect(call[7]).toBe(800);
    expect(call[8]).toBe(600);
  });

  it("generates a cover crop by trimming the top and bottom of taller images", async () => {
    MockImage.naturalWidth = 1000;
    MockImage.naturalHeight = 2000;
    const canvas = createCanvasMock();
    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    const result = await generateCrop("data:image/png;base64,tall", {
      type: "cms_wide",
      width: 1600,
      height: 900,
      fit: "cover",
    });

    const context = canvas.__context;
    expect(result.type).toBe("cms_wide");
    expect(context.drawImage).toHaveBeenCalledTimes(1);

    const call = context.drawImage.mock.calls[0] as [MockImage, number, number, number, number, number, number, number, number];
    expect(call[1]).toBe(0);
    expect(call[2]).toBeCloseTo(718.75, 2);
    expect(call[3]).toBe(1000);
    expect(call[4]).toBeCloseTo(562.5, 2);
    expect(call[5]).toBe(0);
    expect(call[6]).toBe(0);
    expect(call[7]).toBe(1600);
    expect(call[8]).toBe(900);
  });

  it("generates contain crops with a white background", async () => {
    MockImage.naturalWidth = 400;
    MockImage.naturalHeight = 200;
    const canvas = createCanvasMock();
    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    await generateCrop("data:image/png;base64,contain", {
      type: "cms_thumbnail",
      width: 300,
      height: 300,
      fit: "contain",
    });

    const context = canvas.__context;
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 300, 300);
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 400, 200, 0, 0, 300, 300);
  });

  it("rejects when the image cannot be loaded", async () => {
    MockImage.mode = "error";
    const canvas = createCanvasMock();
    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    await expect(
      generateCrop("data:image/png;base64,bad", {
        type: "cms",
        width: 800,
        height: 600,
        fit: "cover",
      }),
    ).rejects.toThrow("Failed to load image");
  });

  it("rejects when the canvas context is missing", async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
      toBlob: vi.fn(),
    } as unknown as HTMLCanvasElement;

    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    await expect(
      generateCrop("data:image/png;base64,nocontext", {
        type: "cms",
        width: 800,
        height: 600,
        fit: "cover",
      }),
    ).rejects.toThrow("Failed to get canvas context");
  });

  it("rejects when the canvas cannot create a blob", async () => {
    const canvas = createCanvasMock(null);
    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    await expect(
      generateCrop("data:image/png;base64,noblob", {
        type: "cms",
        width: 800,
        height: 600,
        fit: "cover",
      }),
    ).rejects.toThrow("Failed to create blob");
  });

  it("generates all predetermined CMS crops in order", async () => {
    const canvas = createCanvasMock();
    createElementSpy.mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === "canvas") {
        return canvas;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    const results = await generateAllCrops("data:image/png;base64,all");

    expect(results).toHaveLength(3);
    expect(results.map((crop) => crop.type)).toEqual(CMS_CROP_DEFINITIONS.map((definition) => definition.type));
    expect(results[0]?.filename).toContain("crop-cms-");
    expect(results[1]?.filename).toContain("crop-cms_thumbnail-");
    expect(results[2]?.filename).toContain("crop-cms_wide-");
  });
});
