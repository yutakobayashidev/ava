import { createHonoApp } from "@/app/create-app";
import { absoluteUrl } from "@/lib/utils";

export const wellknownHandler = createHonoApp().basePath("/.well-known");

wellknownHandler.get("/oauth-authorization-server", (c) => {
  const metadata = {
    issuer: absoluteUrl(""),
    authorization_endpoint: absoluteUrl("/oauth/authorize"),
    token_endpoint: absoluteUrl("/api/oauth/token"),
    registration_endpoint: absoluteUrl("/api/oauth/register"),
    scopes_supported: ["api:read", "api:write"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["plain", "S256"],
    // CIMD (Client ID Metadata Document) サポート
    client_id_metadata_document_supported: true,
  };

  return c.json(metadata);
});

wellknownHandler.get("/oauth-protected-resource", (c) => {
  const metadata = {
    resource: absoluteUrl("/mcp"),
    authorization_servers: [absoluteUrl("")],
    scopes_supported: ["api:read", "api:write"],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/docs"),
  };

  return c.json(metadata);
});
