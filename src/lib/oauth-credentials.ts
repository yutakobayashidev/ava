/**
 * Extract client credentials from request.
 * Supports both client_secret_basic (Authorization header) and client_secret_post (form body).
 *
 * @returns Object containing client_id and client_secret (if present)
 */
export function extractClientCredentials(
  authHeader: string | undefined,
  formClientId: string | undefined,
  formClientSecret: string | undefined,
): { client_id: string | undefined; client_secret: string | undefined } {
  // Try Authorization header first (client_secret_basic)
  if (authHeader?.toLowerCase().startsWith("basic ")) {
    const base64Credentials = authHeader.slice(6); // Remove "Basic " prefix
    try {
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "utf-8",
      );
      // Split on first colon only to handle colons in client_secret
      const colonIndex = credentials.indexOf(":");
      if (colonIndex !== -1) {
        const client_id = credentials.slice(0, colonIndex);
        const client_secret = credentials.slice(colonIndex + 1);

        if (client_id) {
          return {
            client_id: decodeURIComponent(client_id),
            client_secret:
              client_secret !== undefined
                ? decodeURIComponent(client_secret)
                : undefined,
          };
        }
      }
      // If no colon or empty client_id, fall through to form credentials
    } catch (error) {
      console.error("Failed to decode Basic auth header:", error);
      // Fall through to form credentials
    }
  }

  // Fall back to form body (client_secret_post or none)
  return {
    client_id: formClientId,
    client_secret: formClientSecret,
  };
}
