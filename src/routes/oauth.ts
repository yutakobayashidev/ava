import { createHash, randomBytes, randomUUID } from 'crypto';
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { createHonoApp } from '@/app/factory';
import { absoluteUrl } from "@/lib/utils";

const app = createHonoApp()

app.post("/api/oauth/register", async (c) => {

  const body = await c.req.json()

  const { client_name, redirect_uris } = body;

  if (!client_name || !redirect_uris) {
    return c.json(
      { error: 'Missing required fields' },
      400,
    );
  }

  const clientSecret = randomBytes(32).toString('hex');
  const generatedClientId = randomBytes(16).toString('hex');

  try {
    const db = c.get('db');
    const [newClient] = await db
      .insert(schema.clients)
      .values({
        id: randomUUID(),
        clientId: generatedClientId,
        clientSecret,
        name: client_name,
        redirectUris: redirect_uris,
      })
      .returning();

    return c.json({
      client_id: newClient.clientId,
      client_secret: clientSecret,
      redirect_uris,
    });
  } catch (e) {
    console.error(e);
    return c.json(
      { error: 'Error creating client' },
      500,
    );
  }

})

app.post("/api/oauth/token", async (c) => {
  console.log("Received token request");

  const formData = await c.req.formData();
  const grant_type = formData.get('grant_type') as string;
  const code = formData.get('code') as string;
  const redirect_uri = formData.get('redirect_uri') as string;
  const client_id = formData.get('client_id') as string;
  const client_secret = formData.get('client_secret') as string | null;
  const code_verifier = formData.get('code_verifier') as string | undefined;

  console.log("Form data:", { grant_type, code, redirect_uri, client_id });

  if (grant_type !== 'authorization_code') {
    console.log("Unsupported grant type:", grant_type);
    return c.json({ error: 'Unsupported grant type' }, 400);
  }

  if (!code || !redirect_uri || !client_id) {
    console.log("Invalid request: missing parameters");
    return c.json({ error: 'Invalid request' }, 400);
  }

  try {
    console.log("Finding client for client_id:", client_id);
    const db = c.get('db');
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.clientId, client_id));
    if (!client) {
      console.log("Invalid client.", { client_id });
      return c.json({ error: 'Invalid client' }, 401);
    }

    console.log("Finding auth code:", code);
    const [authCode] = await db
      .select()
      .from(schema.authCodes)
      .where(eq(schema.authCodes.code, code));

    if (
      !authCode ||
      authCode.clientId !== client.id ||
      authCode.redirectUri !== redirect_uri
    ) {
      console.log("Invalid code or redirect_uri mismatch.", { authCode, client_id: client.id, redirect_uri });
      return c.json({ error: 'Invalid code' }, 400);
    }
    console.log("Found auth code for user:", authCode.userId);

    if (authCode.expiresAt < new Date()) {
      console.log("Auth code expired at:", authCode.expiresAt);
      return c.json({ error: 'Code expired' }, 400);
    }
    console.log("Auth code is valid.");

    if (authCode.codeChallenge) {
      if (!code_verifier) {
        return c.json({ error: 'Missing code_verifier for PKCE' }, 400);
      }

      let pkceValid = false;
      if (authCode.codeChallengeMethod === 'S256') {
        const hash = createHash('sha256').update(code_verifier).digest();
        const base64url = hash
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        pkceValid = base64url === authCode.codeChallenge;
      } else {
        pkceValid = code_verifier === authCode.codeChallenge;
      }

      if (!pkceValid) {
        return c.json({ error: 'Invalid code_verifier for PKCE' }, 400);
      }
    } else if (client.clientSecret && client.clientSecret !== client_secret) {
      console.log("Invalid client_secret.", { client_id });
      return c.json({ error: 'Invalid client' }, 401);
    }

    console.log("Deleting auth code:", authCode.id);
    await db.delete(schema.authCodes).where(eq(schema.authCodes.id, authCode.id));
    console.log("Auth code deleted.");

    const accessToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    console.log("Creating access token for user:", authCode.userId);
    await db.insert(schema.accessTokens).values({
      id: randomUUID(),
      token: accessToken,
      expiresAt,
      clientId: client.id,
      userId: authCode.userId,
    });
    console.log("Access token created.");

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (e) {
    console.error("Error in token endpoint:", e);
    return c.json({ error: 'Server error' }, 500);
  }
});

app.get("/.well-known/oauth-authorization-server", (c) => {

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
  };

  return c.json(metadata);
});

app.get("/.well-known/oauth-protected-resource", (c) => {

  const metadata = {
    resource: absoluteUrl("/mcp"),
    authorization_servers: [absoluteUrl("")],
    scopes_supported: ["api:read", "api:write"],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/docs"),
  };

  return c.json(metadata);
});

export default app
