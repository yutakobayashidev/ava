import { describe, it, expect, vi } from "vitest";
import { wellknownHandler } from "@/handlers/wellknown";

vi.mock("server-only", () => ({}));

describe("wellknown", () => {
  describe("GET /.well-known/oauth-authorization-server", () => {
    it("should return OAuth authorization server metadata", async () => {
      const res = await wellknownHandler.request(
        "/.well-known/oauth-authorization-server",
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json).toMatchObject({
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: [
          "none",
          "client_secret_post",
          "client_secret_basic",
        ],
        code_challenge_methods_supported: ["plain", "S256"],
      });

      // Verify all required fields are present
      expect(json).toHaveProperty("issuer");
      expect(json).toHaveProperty("authorization_endpoint");
      expect(json).toHaveProperty("token_endpoint");
      expect(json).toHaveProperty("registration_endpoint");
      expect(json).toHaveProperty("scopes_supported");

      // Verify endpoint URLs
      expect(json.authorization_endpoint).toContain("/oauth/authorize");
      expect(json.token_endpoint).toContain("/api/oauth/token");
      expect(json.registration_endpoint).toContain("/api/oauth/register");
    });

    it("should include supported scopes", async () => {
      const res = await wellknownHandler.request(
        "/.well-known/oauth-authorization-server",
      );

      const json = await res.json();
      expect(json.scopes_supported).toContain("api:read");
      expect(json.scopes_supported).toContain("api:write");
    });
  });

  describe("GET /.well-known/oauth-protected-resource", () => {
    it("should return OAuth protected resource metadata", async () => {
      const res = await wellknownHandler.request(
        "/.well-known/oauth-protected-resource",
      );

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json).toMatchObject({
        bearer_methods_supported: ["header"],
      });

      // Verify all required fields are present
      expect(json).toHaveProperty("resource");
      expect(json).toHaveProperty("authorization_servers");
      expect(json).toHaveProperty("scopes_supported");
      expect(json).toHaveProperty("resource_documentation");

      // Verify resource URL
      expect(json.resource).toContain("/mcp");
      expect(json.resource_documentation).toContain("/docs");
    });

    it("should include supported scopes", async () => {
      const res = await wellknownHandler.request(
        "/.well-known/oauth-protected-resource",
      );

      const json = await res.json();
      expect(json.scopes_supported).toContain("api:read");
      expect(json.scopes_supported).toContain("api:write");
    });

    it("should include authorization servers", async () => {
      const res = await wellknownHandler.request(
        "/.well-known/oauth-protected-resource",
      );

      const json = await res.json();
      expect(Array.isArray(json.authorization_servers)).toBe(true);
      expect(json.authorization_servers.length).toBeGreaterThan(0);
    });
  });
});
