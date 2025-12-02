import { describe, it, expect } from "vitest";
import { extractClientCredentials } from "@/lib/oauth-credentials";

describe("extractClientCredentials", () => {
  describe("Authorization header (client_secret_basic)", () => {
    it("should extract credentials from valid Basic auth header", () => {
      const clientId = "test-client";
      const clientSecret = "test-secret";
      const credentials = `${clientId}:${clientSecret}`;
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBe(clientId);
      expect(result.client_secret).toBe(clientSecret);
    });

    it("should handle client_secret with single colon", () => {
      const clientId = "client123";
      const clientSecret = "secret:with:colon";
      const credentials = `${clientId}:${clientSecret}`;
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBe(clientId);
      expect(result.client_secret).toBe(clientSecret);
    });

    it("should handle client_secret with multiple colons", () => {
      const clientId = "client123";
      const clientSecret = "secret:with:multiple:colons:here";
      const credentials = `${clientId}:${clientSecret}`;
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBe(clientId);
      expect(result.client_secret).toBe(clientSecret);
    });

    it("should handle URL-encoded client_id and client_secret", () => {
      const clientId = "client@123";
      const clientSecret = "secret:with:special@chars";
      const credentials = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBe(clientId);
      expect(result.client_secret).toBe(clientSecret);
    });

    it("should return undefined when no colon in credentials", () => {
      const credentials = "invalid-credentials-no-colon";
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBeUndefined();
      expect(result.client_secret).toBeUndefined();
    });

    it("should handle empty client_secret (colon at end)", () => {
      const credentials = "client123:";
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBe("client123");
      expect(result.client_secret).toBe("");
    });

    it("should handle empty client_id (colon at start)", () => {
      const credentials = ":secret123";
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBeUndefined();
      expect(result.client_secret).toBeUndefined();
    });

    it("should fallback to form credentials when no colon in decoded credentials", () => {
      // Create credentials without a colon
      const invalidCredentials = "no-colon-here";
      const authHeader = `Basic ${Buffer.from(invalidCredentials).toString("base64")}`;
      const formClientId = "form-client";
      const formClientSecret = "form-secret";

      const result = extractClientCredentials(
        authHeader,
        formClientId,
        formClientSecret,
      );

      // Should fallback because credentials don't contain a colon
      expect(result.client_id).toBe(formClientId);
      expect(result.client_secret).toBe(formClientSecret);
    });

    it("should be case-insensitive for 'Basic' keyword", () => {
      const clientId = "test-client";
      const clientSecret = "test-secret";
      const credentials = `${clientId}:${clientSecret}`;
      const authHeader = `basic ${Buffer.from(credentials).toString("base64")}`;

      const result = extractClientCredentials(authHeader, undefined, undefined);

      expect(result.client_id).toBe(clientId);
      expect(result.client_secret).toBe(clientSecret);
    });

    it("should ignore non-Basic auth schemes", () => {
      const authHeader = "Bearer some-token";
      const formClientId = "form-client";
      const formClientSecret = "form-secret";

      const result = extractClientCredentials(
        authHeader,
        formClientId,
        formClientSecret,
      );

      expect(result.client_id).toBe(formClientId);
      expect(result.client_secret).toBe(formClientSecret);
    });
  });

  describe("Form body (client_secret_post)", () => {
    it("should return form credentials when no Authorization header", () => {
      const formClientId = "form-client";
      const formClientSecret = "form-secret";

      const result = extractClientCredentials(
        undefined,
        formClientId,
        formClientSecret,
      );

      expect(result.client_id).toBe(formClientId);
      expect(result.client_secret).toBe(formClientSecret);
    });

    it("should handle only client_id in form", () => {
      const formClientId = "form-client";

      const result = extractClientCredentials(
        undefined,
        formClientId,
        undefined,
      );

      expect(result.client_id).toBe(formClientId);
      expect(result.client_secret).toBeUndefined();
    });

    it("should handle only client_secret in form", () => {
      const formClientSecret = "form-secret";

      const result = extractClientCredentials(
        undefined,
        undefined,
        formClientSecret,
      );

      expect(result.client_id).toBeUndefined();
      expect(result.client_secret).toBe(formClientSecret);
    });

    it("should return undefined when no credentials provided", () => {
      const result = extractClientCredentials(undefined, undefined, undefined);

      expect(result.client_id).toBeUndefined();
      expect(result.client_secret).toBeUndefined();
    });
  });

  describe("Priority", () => {
    it("should prioritize Authorization header over form body", () => {
      const headerClientId = "header-client";
      const headerClientSecret = "header-secret";
      const credentials = `${headerClientId}:${headerClientSecret}`;
      const authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

      const formClientId = "form-client";
      const formClientSecret = "form-secret";

      const result = extractClientCredentials(
        authHeader,
        formClientId,
        formClientSecret,
      );

      expect(result.client_id).toBe(headerClientId);
      expect(result.client_secret).toBe(headerClientSecret);
    });
  });
});
