import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { createDBUrl } from "../utils/db";

const pool = postgres(createDBUrl({}), { max: 1 });

export const db = drizzle(pool, { schema });

export type Database = typeof db;