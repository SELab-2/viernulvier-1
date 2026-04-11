// test/routes/media/handlers/s3-utils.test.ts
import { describe, test, expect, vi } from "vitest";
import {
  buildCropPath,
  extractS3Key,
  generateS3Key,
  uploadToS3,
  deleteFromS3,
  deleteManyFromS3,
} from "@/routes/media/handlers/s3-utils.js";

describe("buildCropPath", () => {
  test("prepends /media/crops/ to the s3 key", () => {
    expect(buildCropPath("abc-uuid.jpg")).toBe("/media/crops/abc-uuid.jpg");
  });

  test("handles keys with subdirectories", () => {
    expect(buildCropPath("sub/dir/file.png")).toBe("/media/crops/sub/dir/file.png");
  });
});

describe("extractS3Key", () => {
  test("strips /media/crops/ prefix when present", () => {
    expect(extractS3Key("/media/crops/abc.jpg")).toBe("abc.jpg");
  });

  test("strips prefix and preserves nested paths", () => {
    expect(extractS3Key("/media/crops/sub/dir/file.png")).toBe("sub/dir/file.png");
  });

  test("falls back to last segment when prefix is not present", () => {
    expect(extractS3Key("/some/other/path/image.jpg")).toBe("image.jpg");
  });

  test("falls back to last segment for bare filename", () => {
    expect(extractS3Key("image.jpg")).toBe("image.jpg");
  });

  test("returns path itself when split produces no useful result", () => {
    expect(extractS3Key("")).toBe("");
  });
});

describe("generateS3Key", () => {
  test("generates a UUID-based key preserving the file extension", () => {
    const key = generateS3Key("photo.jpg");
    expect(key).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  });

  test("handles multiple dots in filename — uses last extension", () => {
    const key = generateS3Key("my.photo.backup.png");
    expect(key).toMatch(/^[0-9a-f-]{36}\.png$/);
  });

  test("generates a key without extension when filename has no dot", () => {
    const key = generateS3Key("noextension");
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("generates unique keys on successive calls", () => {
    const key1 = generateS3Key("a.jpg");
    const key2 = generateS3Key("a.jpg");
    expect(key1).not.toBe(key2);
  });
});

describe("uploadToS3", () => {
  test("sends a PutObjectCommand with correct params", async () => {
    const s3Send = vi.fn().mockResolvedValue({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3 = { send: s3Send } as any;

    const buffer = Buffer.from("fake-image");
    await uploadToS3(s3, "test-key.jpg", buffer, "image/jpeg");

    expect(s3Send).toHaveBeenCalledOnce();
    const command = s3Send.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "crops",
      Key: "test-key.jpg",
      Body: buffer,
      ContentType: "image/jpeg",
    });
  });
});

describe("deleteFromS3", () => {
  test("sends a DeleteObjectCommand with correct params", async () => {
    const s3Send = vi.fn().mockResolvedValue({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3 = { send: s3Send } as any;

    await deleteFromS3(s3, "test-key.jpg");

    expect(s3Send).toHaveBeenCalledOnce();
    const command = s3Send.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "crops",
      Key: "test-key.jpg",
    });
  });
});

describe("deleteManyFromS3", () => {
  test("deletes multiple objects by extracting keys from paths", async () => {
    const s3Send = vi.fn().mockResolvedValue({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3 = { send: s3Send } as any;

    await deleteManyFromS3(s3, [
      "/media/crops/first.jpg",
      "/media/crops/second.png",
      "/media/crops/third.webp",
    ]);

    expect(s3Send).toHaveBeenCalledTimes(3);

    const keys = s3Send.mock.calls.map((call: any) => call[0].input.Key);
    expect(keys).toContain("first.jpg");
    expect(keys).toContain("second.png");
    expect(keys).toContain("third.webp");
  });

  test("handles empty array without calling S3", async () => {
    const s3Send = vi.fn().mockResolvedValue({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3 = { send: s3Send } as any;

    await deleteManyFromS3(s3, []);

    expect(s3Send).not.toHaveBeenCalled();
  });

  test("handles paths without the standard prefix", async () => {
    const s3Send = vi.fn().mockResolvedValue({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3 = { send: s3Send } as any;

    await deleteManyFromS3(s3, ["/other/path/file.jpg"]);

    expect(s3Send).toHaveBeenCalledOnce();
    const command = s3Send.mock.calls[0][0];
    expect(command.input.Key).toBe("file.jpg");
  });
});