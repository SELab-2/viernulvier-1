import { ValidationError } from "@/routes/helpers.js";
import { comparePassword, hashPassword } from "@/routes/auth/handlers/hash.js";
import { describe, expect, it } from "vitest";

describe("hash utils", () => {
  it("hashes a password successfully", async () => {
    const hash = await hashPassword("securepassword123");
    expect(hash).toBeTypeOf("string");
    expect(hash).not.toBe("securepassword123");
  });

  it("throws a ValidationError when password is too short", async () => {
    await expect(hashPassword("short")).rejects.toBeInstanceOf(ValidationError);
  });

  it("compares a password against its hash correctly", async () => {
    const password = "securepassword123";
    const hash = await hashPassword(password);
    await expect(comparePassword(password, hash)).resolves.toBe(true);
  });
});