import { neon } from "@neondatabase/serverless";
import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });

export type Database = typeof db;
