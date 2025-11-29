import { drizzle as pgDrizzle } from "drizzle-orm/postgres-js";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import postgres from "postgres";
import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../db/schema";
import { createDBUrl } from "../utils/db";

const db = (() => {
  if (process.env.VERCEL) {
    neonConfig.webSocketConstructor = ws;
    const sql = neon(process.env.DATABASE_URL!);
    return neonDrizzle({ client: sql, schema });
  } else {
    const pool = postgres(createDBUrl({}), { max: 1 });
    return pgDrizzle(pool, { schema });
  }
})();

export { db };
export type Database = typeof db;
