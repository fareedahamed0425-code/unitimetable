import crypto from 'crypto';

/**
 * Hashes a plaintext password using crypto.scryptSync with a unique salt.
 * Output format: scrypt$salt$derivedKey
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored hash format.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Support scrypt format
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, originalDerivedKey] = parts;
    const keyBuffer = Buffer.from(originalDerivedKey, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Fallback for plain match if needed
  return storedHash === password;
}

/**
 * Creates a signed random session token.
 */
export function generateAuthToken(userId: string): string {
  const randomPart = crypto.randomBytes(24).toString('hex');
  const timestamp = Date.now().toString(36);
  return `apu_${userId}_${timestamp}_${randomPart}`;
}
