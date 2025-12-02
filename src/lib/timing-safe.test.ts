import { describe, it, expect } from "vitest";
import { timingSafeCompare } from "@/lib/timing-safe";

describe("timingSafeCompare", () => {
  describe("Equal strings", () => {
    it("should return true for identical strings", () => {
      expect(timingSafeCompare("test", "test")).toBe(true);
    });

    it("should return true for identical long strings", () => {
      const longString = "a".repeat(1000);
      expect(timingSafeCompare(longString, longString)).toBe(true);
    });

    it("should return true for identical empty strings", () => {
      expect(timingSafeCompare("", "")).toBe(true);
    });

    it("should return true for identical special characters", () => {
      expect(timingSafeCompare("!@#$%^&*()", "!@#$%^&*()")).toBe(true);
    });

    it("should return true for identical UTF-8 strings", () => {
      expect(timingSafeCompare("こんにちは", "こんにちは")).toBe(true);
    });
  });

  describe("Different strings", () => {
    it("should return false for different strings", () => {
      expect(timingSafeCompare("test", "TEST")).toBe(false);
    });

    it("should return false for strings with different lengths", () => {
      expect(timingSafeCompare("short", "verylongstring")).toBe(false);
    });

    it("should return false for one empty string", () => {
      expect(timingSafeCompare("", "test")).toBe(false);
      expect(timingSafeCompare("test", "")).toBe(false);
    });

    it("should return false for strings differing by one character", () => {
      expect(timingSafeCompare("test1", "test2")).toBe(false);
    });

    it("should return false for strings with different UTF-8 characters", () => {
      expect(timingSafeCompare("こんにちは", "さようなら")).toBe(false);
    });
  });

  describe("Security properties", () => {
    it("should handle strings with colons", () => {
      expect(
        timingSafeCompare("secret:with:colons", "secret:with:colons"),
      ).toBe(true);
      expect(
        timingSafeCompare("secret:with:colons", "secret:with:different"),
      ).toBe(false);
    });

    it("should handle hex strings (simulating client secrets)", () => {
      const secret1 = "a".repeat(64); // Simulating SHA256 hex
      const secret2 = "b".repeat(64);
      expect(timingSafeCompare(secret1, secret1)).toBe(true);
      expect(timingSafeCompare(secret1, secret2)).toBe(false);
    });

    it("should handle base64url strings (simulating PKCE challenges)", () => {
      const challenge1 = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge2 = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
      expect(timingSafeCompare(challenge1, challenge1)).toBe(true);
      expect(timingSafeCompare(challenge1, challenge2)).toBe(false);
    });

    it("should prevent timing attacks on prefix matching", () => {
      // These should take similar time regardless of where they differ
      const secret = "verylongsecretstring123456789";
      expect(timingSafeCompare(secret, "xerylongsecretstring123456789")).toBe(
        false,
      );
      expect(timingSafeCompare(secret, "verylongsecretstring123456788")).toBe(
        false,
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle strings with null bytes", () => {
      expect(timingSafeCompare("test\x00null", "test\x00null")).toBe(true);
      expect(timingSafeCompare("test\x00null", "test\x00different")).toBe(
        false,
      );
    });

    it("should handle strings with newlines", () => {
      expect(timingSafeCompare("line1\nline2", "line1\nline2")).toBe(true);
      expect(timingSafeCompare("line1\nline2", "line1\nline3")).toBe(false);
    });

    it("should handle very long strings efficiently", () => {
      const long1 = "a".repeat(10000);
      const long2 = "a".repeat(10000);
      const long3 = "a".repeat(9999) + "b";

      expect(timingSafeCompare(long1, long2)).toBe(true);
      expect(timingSafeCompare(long1, long3)).toBe(false);
    });
  });
});
