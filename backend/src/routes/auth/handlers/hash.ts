import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password.
 *
 * @param password - The plaintext password to hash.
 * @returns The hashed password.
 */
export async function hashPassword(
  password: string,
): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
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