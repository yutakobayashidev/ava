/**
 * @vitest-environment node
 */
import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import {
  encrypt,
  decrypt,
  encryptBotTokens,
  decryptBotTokens,
} from "./encryption";

vi.mock("server-only", () => ({}));

describe("encryption", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a valid 32-byte encryption key (64 hex characters)
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt a string", () => {
      const plaintext = "my-secret-token";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for the same plaintext (due to random IV)", () => {
      const plaintext = "my-secret-token";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("should encrypt/decrypt empty string", () => {
      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt/decrypt long strings", () => {
      const plaintext = "x".repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt/decrypt special characters", () => {
      const plaintext = "日本語!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should return encrypted string in correct format (iv:authTag:ciphertext)", () => {
      const plaintext = "test";
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(":");

      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(24); // 12 bytes IV in hex
      expect(parts[1]).toHaveLength(32); // 16 bytes auth tag in hex
      expect(parts[2].length).toBeGreaterThan(0); // ciphertext
    });
  });

  describe("error handling", () => {
    it("should throw error if ENCRYPTION_KEY has invalid length", () => {
      process.env.ENCRYPTION_KEY = "tooshort";

      expect(() => encrypt("test")).toThrow("Encryption failed");
    });

    it("should throw error when decrypting invalid format", () => {
      expect(() => decrypt("invalid")).toThrow("Invalid encrypted data format");
    });

    it("should throw error when decrypting with wrong key", () => {
      const plaintext = "secret";
      const encrypted = encrypt(plaintext);

      // Change the encryption key
      process.env.ENCRYPTION_KEY =
        "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

      expect(() => decrypt(encrypted)).toThrow("Decryption failed");
    });

    it("should throw error when decrypting tampered data", () => {
      const plaintext = "secret";
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext
      const parts = encrypted.split(":");
      parts[2] = parts[2].replace(/0/g, "1");
      const tampered = parts.join(":");

      expect(() => decrypt(tampered)).toThrow("Decryption failed");
    });

    it("should throw error when auth tag is tampered", () => {
      const plaintext = "secret";
      const encrypted = encrypt(plaintext);

      // Tamper with the auth tag
      const parts = encrypted.split(":");
      parts[1] = parts[1].replace(/0/g, "1");
      const tampered = parts.join(":");

      expect(() => decrypt(tampered)).toThrow("Decryption failed");
    });
  });

  describe("encryptBotTokens/decryptBotTokens", () => {
    it("should encrypt and decrypt bot tokens", () => {
      const tokens = {
        accessToken: "test-bot-access-token-1234567890",
        refreshToken: "test-bot-refresh-token-abcdefg",
      };

      const encrypted = encryptBotTokens(tokens);
      const decrypted = decryptBotTokens(encrypted);

      expect(decrypted.accessToken).toBe(tokens.accessToken);
      expect(decrypted.refreshToken).toBe(tokens.refreshToken);
    });

    it("should handle null refresh token", () => {
      const tokens = {
        accessToken: "test-bot-access-token-1234567890",
        refreshToken: null,
      };

      const encrypted = encryptBotTokens(tokens);
      const decrypted = decryptBotTokens(encrypted);

      expect(decrypted.accessToken).toBe(tokens.accessToken);
      expect(decrypted.refreshToken).toBeNull();
    });

    it("should handle undefined refresh token", () => {
      const tokens = {
        accessToken: "test-bot-access-token-1234567890",
      };

      const encrypted = encryptBotTokens(tokens);
      const decrypted = decryptBotTokens(encrypted);

      expect(decrypted.accessToken).toBe(tokens.accessToken);
      expect(decrypted.refreshToken).toBeNull();
    });
  });
});
