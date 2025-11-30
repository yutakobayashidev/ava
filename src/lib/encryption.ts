import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Note: This file should only be imported from server-side code
// The "server-only" import is commented out for testing purposes
// import "server-only";

/**
 * AES-256-GCM encryption/decryption for sensitive data
 *
 * Environment variable required:
 * - ENCRYPTION_KEY: 32-byte hex string (64 characters)
 *   Generate with: openssl rand -hex 32
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCODING = "hex";

/**
 * Get encryption key from environment variable
 * Validation is performed by env.ts at startup
 * @throws Error if ENCRYPTION_KEY is not set (should never happen if env.ts is configured)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. This should be validated at startup by env.ts",
    );
  }

  return Buffer.from(key, ENCODING);
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 * @throws Error if encryption fails
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, "utf8", ENCODING);
    ciphertext += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return [iv.toString(ENCODING), authTag.toString(ENCODING), ciphertext].join(
      ":",
    );
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param encrypted - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encrypted: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encrypted.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);

    if (iv.length !== IV_LENGTH) {
      throw new Error(
        `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`,
      );
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`,
      );
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, ENCODING, "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

/**
 * Encrypt Slack bot tokens for secure storage
 * @param accessToken - Bot access token
 * @param refreshToken - Bot refresh token (optional)
 * @returns Object with encrypted tokens
 */
export function encryptBotTokens(params: {
  accessToken: string;
  refreshToken?: string | null;
}): {
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
} {
  return {
    encryptedAccessToken: encrypt(params.accessToken),
    encryptedRefreshToken: params.refreshToken
      ? encrypt(params.refreshToken)
      : null,
  };
}

/**
 * Decrypt Slack bot tokens
 * @param encryptedAccessToken - Encrypted bot access token
 * @param encryptedRefreshToken - Encrypted bot refresh token (optional)
 * @returns Object with decrypted tokens
 */
export function decryptBotTokens(params: {
  encryptedAccessToken: string;
  encryptedRefreshToken?: string | null;
}): {
  accessToken: string;
  refreshToken: string | null;
} {
  return {
    accessToken: decrypt(params.encryptedAccessToken),
    refreshToken: params.encryptedRefreshToken
      ? decrypt(params.encryptedRefreshToken)
      : null,
  };
}
