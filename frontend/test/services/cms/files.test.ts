import { beforeEach, describe, expect, it, vi } from "vitest";
import { fileToDataUrl } from "@/services/cms/files";

type ReaderBehavior = "success" | "error";

let readerBehavior: ReaderBehavior = "success";

class MockFileReader {
  public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  public onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  public result: string | ArrayBuffer | null = null;

  readAsDataURL(_file: Blob): void {
    if (readerBehavior === "success") {
      this.result = "data:image/png;base64,abc";
      this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      return;
    }

    this.result = null;
    this.onerror?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
  }
}

describe("cms/files", () => {
  beforeEach(() => {
    readerBehavior = "success";
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
  });

  it("resolves with a data URL when FileReader succeeds", async () => {
    const file = new Blob(["abc"], { type: "image/png" });
    const dataUrl = await fileToDataUrl(file as unknown as File);

    expect(dataUrl).toBe("data:image/png;base64,abc");
  });

  it("converts null FileReader results to an empty string", async () => {
    class NullResultReader extends MockFileReader {
      readAsDataURL(_file: Blob): void {
        this.result = null;
        this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    }

    vi.stubGlobal("FileReader", NullResultReader as unknown as typeof FileReader);

    const file = new Blob(["abc"], { type: "image/png" });
    const dataUrl = await fileToDataUrl(file as unknown as File);

    expect(dataUrl).toBe("");
  });

  it("rejects with the expected error when FileReader fails", async () => {
    readerBehavior = "error";
    const file = new Blob(["abc"], { type: "image/png" });

    await expect(fileToDataUrl(file as unknown as File)).rejects.toThrow("file-read-failed");
  });
});
