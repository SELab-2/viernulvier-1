import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password.
 *
 * @param password - The plaintext password to hash.
 * @returns The hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}