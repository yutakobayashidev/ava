import { describe, expect, it } from "vitest";
import {
  CIMD_DEFAULT_CACHE_TTL,
  CIMD_MAX_CACHE_TTL,
  CIMD_MAX_SIZE_BYTES,
  isClientMetadataUrl,
  parseCacheControlMaxAge,
  readJsonWithSizeLimit,
} from "./cimd";

describe("isClientMetadataUrl", () => {
  it("should return true for valid HTTPS URLs with non-root path", () => {
    expect(isClientMetadataUrl("https://example.com/.well-known/client")).toBe(
      true,
    );
    expect(isClientMetadataUrl("https://example.com/metadata.json")).toBe(true);
    expect(isClientMetadataUrl("https://api.example.com/client/123")).toBe(
      true,
    );
  });

  it("should return false for HTTPS URLs with root path", () => {
    expect(isClientMetadataUrl("https://example.com/")).toBe(false);
    expect(isClientMetadataUrl("https://example.com")).toBe(false);
  });

  it("should return false for HTTP URLs", () => {
    expect(isClientMetadataUrl("http://example.com/client")).toBe(false);
  });

  it("should return false for invalid URLs", () => {
    expect(isClientMetadataUrl("not-a-url")).toBe(false);
    expect(isClientMetadataUrl("")).toBe(false);
    expect(isClientMetadataUrl("ftp://example.com/client")).toBe(false);
  });

  it("should return false for javascript: URLs", () => {
    expect(isClientMetadataUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("parseCacheControlMaxAge", () => {
  it("should return default TTL when Cache-Control is null", () => {
    expect(parseCacheControlMaxAge(null, 3600, 86400)).toBe(3600);
  });

  it("should return default TTL when max-age is not found", () => {
    expect(parseCacheControlMaxAge("public, no-cache", 3600, 86400)).toBe(3600);
    expect(parseCacheControlMaxAge("", 3600, 86400)).toBe(3600);
  });

  it("should parse max-age correctly", () => {
    expect(parseCacheControlMaxAge("max-age=7200", 3600, 86400)).toBe(7200);
    expect(parseCacheControlMaxAge("public, max-age=7200", 3600, 86400)).toBe(
      7200,
    );
    expect(parseCacheControlMaxAge("max-age=7200, public", 3600, 86400)).toBe(
      7200,
    );
  });

  it("should be case-insensitive", () => {
    expect(parseCacheControlMaxAge("MAX-AGE=7200", 3600, 86400)).toBe(7200);
    expect(parseCacheControlMaxAge("Max-Age=7200", 3600, 86400)).toBe(7200);
  });

  it("should handle whitespace around max-age", () => {
    expect(parseCacheControlMaxAge("max-age = 7200", 3600, 86400)).toBe(7200);
    expect(parseCacheControlMaxAge("max-age  =  7200", 3600, 86400)).toBe(7200);
  });

  it("should enforce maximum TTL", () => {
    expect(parseCacheControlMaxAge("max-age=100000", 3600, 86400)).toBe(86400);
    expect(parseCacheControlMaxAge("max-age=86401", 3600, 86400)).toBe(86400);
  });

  it("should return default TTL for invalid max-age values", () => {
    expect(parseCacheControlMaxAge("max-age=abc", 3600, 86400)).toBe(3600);
    expect(parseCacheControlMaxAge("max-age=-100", 3600, 86400)).toBe(3600);
    expect(parseCacheControlMaxAge("max-age=0", 3600, 86400)).toBe(3600);
  });

  it("should use CIMD constants correctly", () => {
    // デフォルトTTL (1時間)
    expect(
      parseCacheControlMaxAge(null, CIMD_DEFAULT_CACHE_TTL, CIMD_MAX_CACHE_TTL),
    ).toBe(3600);

    // 最大TTL (24時間)
    expect(
      parseCacheControlMaxAge(
        "max-age=100000",
        CIMD_DEFAULT_CACHE_TTL,
        CIMD_MAX_CACHE_TTL,
      ),
    ).toBe(86400);
  });
});

describe("readJsonWithSizeLimit", () => {
  it("should read valid JSON within size limit", async () => {
    const json = { message: "hello" };
    const response = new Response(JSON.stringify(json));

    const result = await readJsonWithSizeLimit(response, 1024);

    expect(result).toEqual(json);
  });

  it("should handle large JSON within limit", async () => {
    const largeJson = { data: "x".repeat(4000) };
    const response = new Response(JSON.stringify(largeJson));

    const result = await readJsonWithSizeLimit(response, CIMD_MAX_SIZE_BYTES);

    expect(result).toEqual(largeJson);
  });

  it("should return null when response body is null", async () => {
    const response = new Response(null);

    const result = await readJsonWithSizeLimit(response, 1024);

    expect(result).toBeNull();
  });

  it("should return null for invalid JSON", async () => {
    const response = new Response("not valid json");

    const result = await readJsonWithSizeLimit(response, 1024);

    expect(result).toBeNull();
  });

  it("should return null when size exceeds limit", async () => {
    const largeData = { data: "x".repeat(10000) };
    const response = new Response(JSON.stringify(largeData));

    const result = await readJsonWithSizeLimit(response, 100);

    expect(result).toBeNull();
  });

  it("should handle empty JSON object", async () => {
    const response = new Response("{}");

    const result = await readJsonWithSizeLimit(response, 1024);

    expect(result).toEqual({});
  });

  it("should handle empty JSON array", async () => {
    const response = new Response("[]");

    const result = await readJsonWithSizeLimit(response, 1024);

    expect(result).toEqual([]);
  });

  it("should handle nested JSON structures", async () => {
    const nested = {
      level1: {
        level2: {
          level3: {
            value: "deep",
          },
        },
      },
    };
    const response = new Response(JSON.stringify(nested));

    const result = await readJsonWithSizeLimit(response, 1024);

    expect(result).toEqual(nested);
  });
});
