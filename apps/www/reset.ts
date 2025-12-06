import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import postgres from "postgres";
import * as schema from "@ava/database/schema";
import { createDBUrl } from "@ava/database/utils";
import { config } from "./env";

config();

export async function clearDatabase() {
  console.log("🗑️ Clearing database...");

  const sql = postgres(createDBUrl({}), { prepare: false });
  const db = drizzle(sql, { schema });
  await reset(db, schema);
  await sql.end();
}

(async () => {
  await clearDatabase();
})();
