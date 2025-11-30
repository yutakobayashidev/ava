import "server-only";

import { drizzle as pgDrizzle } from "drizzle-orm/postgres-js";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import postgres from "postgres";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../db/schema";
import { createDBUrl } from "../utils/db";

const db = (() => {
  if (process.env.VERCEL) {
    neonConfig.webSocketConstructor = ws;
    return neonDrizzle(process.env.DATABASE_URL!, { schema });
  } else {
    const pool = postgres(createDBUrl({}));
    return pgDrizzle(pool, { schema });
  }
})();

export { db };
export type Database = typeof db;

export type PgDatabase = ReturnType<typeof pgDrizzle<typeof schema>>;
