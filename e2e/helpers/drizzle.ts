import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

export async function generateDrizzleClient(url: string) {
  const pool = postgres(url, { max: 1 });

  const db = drizzle(pool, { schema });

  return {
    db,
    async [Symbol.asyncDispose]() {
      await pool.end();
    },
  } as const;
}
