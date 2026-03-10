import { describe, test, expect, vi } from "vitest";
import { start } from "@/server.js";

// This is a different file than server.test.ts, because it needs a different mock.

vi.mock("@/plugins/postgres.js", () => ({
  default: vi.fn().mockRejectedValue(new Error("DB connection failed")),
}));

describe("start()", () => {
  test("throws an error on failed DB connection", async () => {
    await expect(start()).rejects.toThrow("DB connection failed");
  });
});