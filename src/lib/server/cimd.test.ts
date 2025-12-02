import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isCimdClientId,
  fetchCimdDocument,
  fetchCimdDocumentWithCache,
  type CimdDocument,
} from "./cimd";

describe("isCimdClientId", () => {
  it("HTTPS URL の場合は true を返す", () => {
    expect(isCimdClientId("https://example.com/client.json")).toBe(true);
  });

  it("HTTP URL の場合は false を返す", () => {
    expect(isCimdClientId("http://example.com/client.json")).toBe(false);
  });

  it("通常の文字列の場合は false を返す", () => {
    expect(isCimdClientId("test-client-id")).toBe(false);
  });
});

describe("fetchCimdDocument", () => {
  const validCimdDocument: CimdDocument = {
    client_id: "https://example.com/client.json",
    client_name: "Test Client",
    redirect_uris: ["https://example.com/callback"],
    token_endpoint_auth_method: "none",
  };

  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("有効な CIMD ドキュメントを取得できる", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(validCimdDocument),
    } as Response);

    const result = await fetchCimdDocument("https://example.com/client.json");

    expect.assert(result.success === true);
    expect(result.document.client_id).toBe("https://example.com/client.json");
    expect(result.document.client_name).toBe("Test Client");
  });

  it("HTTP URL はエラーを返す", async () => {
    const result = await fetchCimdDocument("http://example.com/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("HTTPS");
  });

  it("プライベート IP はエラーを返す", async () => {
    const result = await fetchCimdDocument("https://192.168.1.1/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("private");
  });

  it("localhost はエラーを返す", async () => {
    const result = await fetchCimdDocument("https://localhost/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("private");
  });

  it("client_id が一致しない場合はエラーを返す", async () => {
    const invalidDocument = {
      ...validCimdDocument,
      client_id: "https://different-url.com/client.json",
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(invalidDocument),
    } as Response);

    const result = await fetchCimdDocument("https://example.com/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("must match");
  });

  it("HTTP redirect_uri はエラーを返す", async () => {
    const invalidDocument = {
      ...validCimdDocument,
      redirect_uris: ["http://example.com/callback"],
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(invalidDocument),
    } as Response);

    const result = await fetchCimdDocument("https://example.com/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("HTTPS");
  });

  it("Content-Type が application/json でない場合はエラーを返す", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => JSON.stringify(validCimdDocument),
    } as Response);

    const result = await fetchCimdDocument("https://example.com/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("application/json");
  });

  it("5KB を超えるドキュメントはエラーを返す", async () => {
    const largeDocument = {
      ...validCimdDocument,
      extra_data: "x".repeat(6000),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(largeDocument),
    } as Response);

    const result = await fetchCimdDocument("https://example.com/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("too large");
  });

  it("不正な JSON はエラーを返す", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => "invalid json",
    } as Response);

    const result = await fetchCimdDocument("https://example.com/client.json");

    expect.assert(result.success === false);
    expect(result.error).toBe("invalid_client_metadata");
    expect(result.errorDescription).toContain("Invalid JSON");
  });
});

describe("fetchCimdDocumentWithCache", () => {
  const validCimdDocument: CimdDocument = {
    client_id: "https://example.com/client.json",
    client_name: "Test Client",
    redirect_uris: ["https://example.com/callback"],
    token_endpoint_auth_method: "none",
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("キャッシュがない場合はフェッチする", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(validCimdDocument),
    } as Response);

    const result = await fetchCimdDocumentWithCache(
      "https://example.com/client.json",
    );

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
