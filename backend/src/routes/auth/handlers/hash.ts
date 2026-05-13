import { ValidationError } from "@/routes/helpers.js";
import bcrypt from "bcrypt";
import z from "zod";

const SALT_ROUNDS = 12;

export const zPassword = z.string().min(8).max(72);

export const PasswordBase = {
  password: zPassword,
}

const PasswordValidationSchema = z.object(PasswordBase);

/**
 * Hashes a plaintext password.
 *
 * @param password - The plaintext password to hash.
 * @returns The hashed password.
 * @throws `HttpError` If the password isn't greater than 8 letters or lower than 72.
 */
export async function hashPassword(
  password: string,
): Promise<string> {
  // validate password for extra security (in most functions using this one it's already validated, but not all)
  const parsed = PasswordValidationSchema.safeParse({ password });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }

  return await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
}

/**
 * Compares a plain text password against a bcrypt hash.
 *
 * @param password - The plain text password to verify.
 * @param hash - The bcrypt hash to compare against.
 * @returns `true` if the password matches the hash, `false` otherwise.
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}