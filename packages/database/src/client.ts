import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";
import * as schema from "./schema";
import { createDBUrl } from "./utils";

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
