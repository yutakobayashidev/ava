#!/usr/bin/env tsx

import { uuidv7 } from "uuidv7";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Create database client for script
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  const clientId = process.argv[2];
  const name = process.argv[3];
  const redirectUris = process.argv.slice(4);

  if (!clientId || !name || redirectUris.length === 0) {
    console.error(
      "Usage: tsx scripts/register-client.ts <client_id> <name> <redirect_uri1> [redirect_uri2...]",
    );
    console.error("\nExample:");
    console.error(
      "  tsx scripts/register-client.ts raycast-extension 'Raycast Extension' https://raycast.com/redirect",
    );
    process.exit(1);
  }

  const [existingClient] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.clientId, clientId))
    .limit(1);

  if (existingClient) {
    if (existingClient.isPreRegistered) {
      console.log(`Updating pre-registered client: ${name}`);
      await db
        .update(schema.clients)
        .set({
          name,
          redirectUris,
        })
        .where(eq(schema.clients.clientId, clientId));
      console.log(`✓ Client updated: ${clientId}`);
    } else {
      console.error(
        `✗ Client ${clientId} already exists but is not pre-registered.`,
      );
      process.exit(1);
    }
  } else {
    console.log(`Creating pre-registered client: ${name}`);
    await db.insert(schema.clients).values({
      id: uuidv7(),
      clientId,
      clientSecret: null,
      name,
      redirectUris,
      isPreRegistered: true,
    });
    console.log(`✓ Client created: ${clientId}`);
  }

  console.log("\nClient details:");
  console.log(`  client_id: ${clientId}`);
  console.log(`  name: ${name}`);
  console.log(`  redirect_uris: ${redirectUris.join(", ")}`);

  await client.end();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Error:", error);
  await client.end();
  process.exit(1);
});
