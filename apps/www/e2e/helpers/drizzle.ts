import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@ava/database/schema";

export async function generateDrizzleClient(url: string) {
  const pool = postgres(url);

  const db = drizzle(pool, { schema });

  return {
    db,
    async [Symbol.asyncDispose]() {
      await pool.end();
    },
  } as const;
}
